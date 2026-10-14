import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, UserX, UserPlus, Search, Eye, Trash2 } from 'lucide-react';
import { UserDetailsModal } from './UserDetailsModal';
import { getEffectiveUserAccess } from '@/lib/user-role';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
  is_active: boolean;
  role_type: string;
  status?: string;
}

export const UsersManagement = () => {
  const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, inactive: 0, suspended: 0 });
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsersData();
  }, []);

  const loadUsersData = async () => {
    try {
      // Buscar apenas usuários clientes (role_type 'user' ou 'client')
      const { data: clientUsers, error: clientError } = await supabase
        .from('users')
        .select('id, full_name, email, phone, created_at, is_active, role_type')
        .in('role_type', ['user', 'client'])
        .order('created_at', { ascending: false });

      if (clientError) throw clientError;

      const allUsers: User[] = (clientUsers || []).map(user => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at,
        is_active: user.is_active,
        role_type: user.role_type || 'user'
      }));

      setUsers(allUsers);

      // Calculate stats
      const total = allUsers.length;
      const active = allUsers.filter(u => u.is_active).length;
      const inactive = allUsers.filter(u => !u.is_active).length;

      setStats({
        total,
        active,
        inactive,
        suspended: 0
      });
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && user.is_active;
    if (statusFilter === 'inactive') return matchesSearch && !user.is_active;
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (user: User) => {
    if (user.is_active) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Ativo</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 border-red-200">Inativo</Badge>;
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const extractFunctionErrorMessage = async (error: unknown) => {
    const functionError = error as { message?: string; context?: unknown };
    const fallback = functionError.message || 'Não foi possível excluir o usuário.';
    const response = functionError.context;
    if (!(response instanceof Response)) return fallback;

    try {
      const payload = await response.clone().json();
      return payload?.error || payload?.message || fallback;
    } catch {
      try {
        const text = await response.clone().text();
        return text || fallback;
      } catch {
        return fallback;
      }
    }
  };

  const getValidatedAdminToken = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    let { data: sessionData } = await supabase.auth.getSession();

    if (userError || !userData?.user || !sessionData.session?.access_token) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      sessionData = { session: refreshData.session } as typeof sessionData;

      if (refreshError || !refreshData.session?.access_token) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        throw new Error('Sessão administrativa expirada. Faça login novamente no painel admin.');
      }

      const { data: refreshedUser, error: refreshedUserError } = await supabase.auth.getUser(
        refreshData.session.access_token,
      );
      if (refreshedUserError || !refreshedUser.user) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        throw new Error('Sessão administrativa inválida. Faça login novamente no painel admin.');
      }

      const { role } = await getEffectiveUserAccess(refreshedUser.user.id, refreshedUser.user.email);
      if (role !== 'admin') {
        throw new Error('Acesso restrito a administradores. Faça login com uma conta admin.');
      }

      return refreshData.session.access_token;
    }

    const { role } = await getEffectiveUserAccess(userData.user.id, userData.user.email);
    if (role !== 'admin') {
      throw new Error('Acesso restrito a administradores. Faça login com uma conta admin.');
    }

    return sessionData.session.access_token;
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const accessToken = await getValidatedAdminToken();

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userToDelete.id },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error || data?.error) {
        const functionMessage = error ? await extractFunctionErrorMessage(error) : data?.error;
        throw new Error(functionMessage || 'Não foi possível excluir o usuário.');
      }

      toast({
        title: 'Usuário excluído',
        description: `${userToDelete.full_name} foi removido completamente da plataforma.`,
      });
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
      loadUsersData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível excluir o usuário.';
      console.error('Erro ao excluir usuário:', err);
      toast({
        title: 'Erro ao excluir',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Gestão de Usuários</h2>
        <p className="text-muted-foreground">Gerencie todos os usuários da plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Usuários Ativos</CardTitle>
            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Usuários Inativos</CardTitle>
            <UserX className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.inactive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Usuários Suspensos</CardTitle>
            <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.suspended}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 lg:flex-initial lg:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <p className="text-sm text-muted-foreground">
            Todos os usuários cadastrados na plataforma
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-base">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground break-all">{user.email}</p>
                      {user.phone && (
                        <p className="text-sm text-muted-foreground">{user.phone}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Desde {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                    {getStatusBadge(user)}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleViewDetails(user)}
                      >
                        <Eye className="w-4 h-4" />
                        <span className="sr-only">Ver detalhes</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setUserToDelete(user)}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Excluir usuário</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Usuário */}
      <UserDetailsModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>{userToDelete?.full_name}</strong> ({userToDelete?.email})
              completamente da plataforma — incluindo o acesso (auth) e todos os dados no banco.
              O e-mail ficará livre para um novo cadastro. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
