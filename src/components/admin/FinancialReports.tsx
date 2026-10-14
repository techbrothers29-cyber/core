import { useState, useEffect, useCallback } from 'react';
import { startOfDay, endOfDay, subDays, differenceInCalendarDays, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Download, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

interface FinancialStats {
  totalRevenue: number;
  paidCommissions: number;
  netProfit: number;
  monthlyGrowth: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  commissions: number;
}

interface RevenueByCategoryItem {
  category: string;
  revenue: number;
}

const formatMonthLabel = (date: Date) => {
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return month.charAt(0).toUpperCase() + month.slice(1);
};

export const FinancialReports = () => {
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    paidCommissions: 0,
    netProfit: 0,
    monthlyGrowth: 0
  });
  const [period, setPeriod] = useState('thisMonth');
  const [loading, setLoading] = useState(true);
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategoryItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [exportingReport, setExportingReport] = useState<string | null>(null);

  useEffect(() => {
    loadFinancialData();
  }, [period]);

  const getPeriodRange = (selectedPeriod: string) => {
    const now = new Date();

    switch (selectedPeriod) {
      case 'lastMonth': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start, end };
      }
      case 'last3Months':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          end: endOfDay(now)
        };
      case 'thisYear':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: endOfDay(now)
        };
      case 'thisMonth':
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: endOfDay(now)
        };
    }
  };

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      const { start, end } = getPeriodRange(period);
      const periodDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
      const previousStart = startOfDay(subDays(start, periodDays));
      const previousEnd = endOfDay(subDays(start, 1));

      const [{ data: transactions, error: transError }, { data: userVouchers, error: userVouchersError }, { data: offers, error: offersError }] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, net_amount, fee_amount, created_at, user_voucher_id, status')
          .eq('status', 'completed')
          .gte('created_at', previousStart.toISOString())
          .lte('created_at', end.toISOString()),
        supabase
          .from('user_vouchers')
          .select('id, offer_id'),
        supabase
          .from('offers')
          .select('id, category')
      ]);

      if (transError) throw transError;
      if (userVouchersError) throw userVouchersError;
      if (offersError) throw offersError;

      const allTransactions = transactions || [];
      const currentTransactions = allTransactions.filter((transaction) => {
        const transactionDate = new Date(transaction.created_at || '');
        return transactionDate >= start && transactionDate <= end;
      });

      const previousTransactions = allTransactions.filter((transaction) => {
        const transactionDate = new Date(transaction.created_at || '');
        return transactionDate >= previousStart && transactionDate <= previousEnd;
      });

      const currentRevenue = currentTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      const previousRevenue = previousTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      const totalCommissions = currentTransactions.reduce((sum, transaction) => sum + Number(transaction.fee_amount || 0), 0);
      const netProfit = currentTransactions.reduce((sum, transaction) => {
        const netAmount = transaction.net_amount != null
          ? Number(transaction.net_amount)
          : Number(transaction.amount || 0) - Number(transaction.fee_amount || 0);
        return sum + netAmount;
      }, 0);

      const monthlyGrowth = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

      const categoryByOfferId = new Map<string, string>();
      (offers || []).forEach((offer) => {
        categoryByOfferId.set(offer.id, offer.category || 'Outros');
      });

      const categoryByUserVoucherId = new Map<string, string>();
      (userVouchers || []).forEach((voucher) => {
        if (!voucher.offer_id) return;
        categoryByUserVoucherId.set(voucher.id, categoryByOfferId.get(voucher.offer_id) || 'Outros');
      });

      const categoryRevenue = currentTransactions.reduce<Record<string, number>>((accumulator, transaction) => {
        const category = transaction.user_voucher_id
          ? categoryByUserVoucherId.get(transaction.user_voucher_id) || 'Outros'
          : 'Outros';

        accumulator[category] = (accumulator[category] || 0) + Number(transaction.amount || 0);
        return accumulator;
      }, {});

      const categoryData = Object.entries(categoryRevenue)
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      const monthBuckets = new Map<string, MonthlyData>();
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

      while (cursor <= endMonth) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        monthBuckets.set(key, {
          month: formatMonthLabel(cursor),
          revenue: 0,
          commissions: 0
        });

        cursor.setMonth(cursor.getMonth() + 1);
      }

      currentTransactions.forEach((transaction) => {
        const transactionDate = new Date(transaction.created_at || '');
        const key = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthBuckets.get(key);

        if (!bucket) return;

        bucket.revenue += Number(transaction.amount || 0);
        bucket.commissions += Number(transaction.fee_amount || 0);
      });

      setStats({
        totalRevenue: currentRevenue,
        paidCommissions: totalCommissions,
        netProfit,
        monthlyGrowth
      });

      setRevenueByCategory(categoryData);
      setMonthlyData(Array.from(monthBuckets.values()));
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const downloadCsv = (filename: string, csvContent: string) => {
    const BOM = '﻿';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportMonthlyReport = useCallback(async () => {
    setExportingReport('monthly');
    try {
      const { start, end } = getPeriodRange(period);
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, net_amount, fee_amount, status, payment_method, type, description, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []).map(t => [
        t.id,
        format(new Date(t.created_at || ''), 'dd/MM/yyyy HH:mm'),
        t.type, t.description || '', t.payment_method || '', t.status || '',
        Number(t.amount || 0).toFixed(2),
        Number(t.fee_amount || 0).toFixed(2),
        Number(t.net_amount || 0).toFixed(2),
      ]);
      const header = 'ID;Data;Tipo;Descrição;Método Pagamento;Status;Valor Bruto;Taxa;Valor Líquido';
      downloadCsv(`relatorio-mensal-${format(new Date(), 'yyyy-MM-dd')}.csv`, [header, ...rows.map(r => r.join(';'))].join('\n'));
      toast.success('Relatório mensal exportado com sucesso');
    } catch (err) { console.error(err); toast.error('Erro ao exportar relatório mensal'); }
    finally { setExportingReport(null); }
  }, [period]);

  const exportCommissionsReport = useCallback(async () => {
    setExportingReport('commissions');
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('full_name, email, affiliate_code, commission_rate, total_earnings, pending_earnings, total_clicks, total_conversions, status, created_at');
      if (error) throw error;
      const rows = (data || []).map(a => [
        a.full_name || '', a.email || '', a.affiliate_code, a.status || '',
        Number(a.commission_rate || 0).toFixed(2) + '%',
        Number(a.total_earnings || 0).toFixed(2),
        Number(a.pending_earnings || 0).toFixed(2),
        a.total_clicks || 0, a.total_conversions || 0,
        a.created_at ? format(new Date(a.created_at), 'dd/MM/yyyy') : '',
      ]);
      const header = 'Nome;Email;Código;Status;Taxa Comissão;Total Ganhos;Ganhos Pendentes;Cliques;Conversões;Cadastro';
      downloadCsv(`relatorio-comissoes-${format(new Date(), 'yyyy-MM-dd')}.csv`, [header, ...rows.map(r => r.join(';'))].join('\n'));
      toast.success('Relatório de comissões exportado com sucesso');
    } catch (err) { console.error(err); toast.error('Erro ao exportar relatório de comissões'); }
    finally { setExportingReport(null); }
  }, []);

  const exportPerformanceReport = useCallback(async () => {
    setExportingReport('performance');
    try {
      const { data, error } = await supabase.rpc('get_offers_admin_data');
      if (error) throw error;
      const { data: vouchers } = await supabase.from('user_vouchers').select('offer_id, purchase_price, status');
      const vouchersByOffer = (vouchers || []).reduce<Record<string, { sold: number; revenue: number }>>((acc, v) => {
        const key = v.offer_id || 'none';
        if (!acc[key]) acc[key] = { sold: 0, revenue: 0 };
        acc[key].sold += 1;
        acc[key].revenue += Number(v.purchase_price || 0);
        return acc;
      }, {});
      const rows = (data || []).map(o => {
        const s = vouchersByOffer[o.id] || { sold: 0, revenue: 0 };
        return [o.title, o.company_name || '', o.category || '', o.is_active ? 'Ativa' : 'Inativa',
          Number(o.price || 0).toFixed(2), Number(o.original_price || 0).toFixed(2),
          o.discount_percent || 0, s.sold, s.revenue.toFixed(2),
          o.created_at ? format(new Date(o.created_at), 'dd/MM/yyyy') : ''];
      });
      const header = 'Oferta;Empresa;Categoria;Status;Preço;Preço Original;Desconto %;Vendas;Receita Gerada;Criação';
      downloadCsv(`analise-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`, [header, ...rows.map(r => r.join(';'))].join('\n'));
      toast.success('Análise de performance exportada com sucesso');
    } catch (err) { console.error(err); toast.error('Erro ao exportar análise de performance'); }
    finally { setExportingReport(null); }
  }, []);

  const exportRevenueProjection = useCallback(async () => {
    setExportingReport('projection');
    try {
      const { data, error } = await supabase
        .from('transactions').select('amount, created_at').eq('status', 'completed').order('created_at', { ascending: true });
      if (error) throw error;
      const monthlyTotals = new Map<string, number>();
      (data || []).forEach(t => {
        const d = new Date(t.created_at || '');
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + Number(t.amount || 0));
      });
      const entries = Array.from(monthlyTotals.entries()).sort();
      const last3 = entries.slice(-3);
      const avgGrowth = last3.length >= 2
        ? last3.reduce((acc, [, val], i, arr) => {
            if (i === 0) return 0;
            const prev = arr[i - 1][1];
            return acc + (prev > 0 ? (val - prev) / prev : 0);
          }, 0) / (last3.length - 1) : 0;
      const projRows: string[][] = [];
      entries.forEach(([month, rev]) => projRows.push([month, rev.toFixed(2), 'Realizado', '']));
      let projected = entries.length > 0 ? entries[entries.length - 1][1] : 0;
      const now = new Date();
      for (let i = 1; i <= 6; i++) {
        const fd = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const key = `${fd.getFullYear()}-${String(fd.getMonth() + 1).padStart(2, '0')}`;
        projected = projected * (1 + avgGrowth);
        projRows.push([key, projected.toFixed(2), 'Projetado', (avgGrowth * 100).toFixed(1) + '%']);
      }
      const header = 'Mês;Receita (R$);Tipo;Taxa Crescimento';
      downloadCsv(`projecao-receita-${format(new Date(), 'yyyy-MM-dd')}.csv`, [header, ...projRows.map(r => r.join(';'))].join('\n'));
      toast.success('Projeção de receita exportada com sucesso');
    } catch (err) { console.error(err); toast.error('Erro ao exportar projeção'); }
    finally { setExportingReport(null); }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Relatórios Financeiros</h2>
          <p className="text-muted-foreground">Acompanhe a performance financeira da plataforma</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">Este Mês</SelectItem>
              <SelectItem value="lastMonth">Mês Passado</SelectItem>
              <SelectItem value="last3Months">Últimos 3 Meses</SelectItem>
              <SelectItem value="thisYear">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportMonthlyReport} disabled={!!exportingReport}>
            {exportingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Main Financial Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <div className="animate-pulse bg-muted h-4 w-20 rounded"></div>
                <div className="animate-pulse bg-muted h-4 w-4 rounded"></div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="animate-pulse bg-muted h-8 w-24 rounded"></div>
                <div className="animate-pulse bg-muted h-3 w-16 rounded mt-1"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">Vendas da plataforma</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Comissões Pagas</CardTitle>
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-lg sm:text-2xl font-bold text-red-600">
                  {formatCurrency(stats.paidCommissions)}
                </div>
                <p className="text-xs text-muted-foreground">Para afiliados e parceiros</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.netProfit)}
                </div>
                <p className="text-xs text-muted-foreground">Receita - comissões</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Crescimento Mensal</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {formatPercentage(stats.monthlyGrowth)}
                </div>
                <p className="text-xs text-muted-foreground">vs mês anterior</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts and Detailed Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Evolution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução Financeira</CardTitle>
            <p className="text-sm text-muted-foreground">
              Crescimento da receita e comissões ao longo do tempo
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="h-full bg-gradient-to-br from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis
                      tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        name === 'revenue' ? 'Receita' : 'Comissões'
                      ]}
                      labelStyle={{ color: '#000' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Receita"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="commissions"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Comissões"
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full bg-gradient-to-br from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nenhum dado disponível</p>
                    <p className="text-sm mt-2">Dados aparecerão quando houver transações</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Composition */}
        <Card>
          <CardHeader>
            <CardTitle>Composição da Receita</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribuição da receita por fonte de renda
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : revenueByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="revenue"
                      nameKey="category"
                    >
                      {revenueByCategory.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={[
                            '#10b981', // green
                            '#3b82f6', // blue
                            '#8b5cf6', // purple
                            '#f59e0b', // amber
                            '#ef4444', // red
                            '#6b7280'  // gray
                          ][index % 6]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        name
                      ]}
                      labelStyle={{ color: '#000' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nenhum dado disponível</p>
                    <p className="text-sm mt-2">Dados aparecerão quando houver ofertas</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receita por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : revenueByCategory.length > 0 ? (
                revenueByCategory.slice(0, 4).map((item) => (
                  <div key={item.category} className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm font-medium">{item.category}</span>
                    <span className="text-sm font-bold">{formatCurrency(item.revenue)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relatórios Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={exportMonthlyReport} disabled={exportingReport === 'monthly'}>
                {exportingReport === 'monthly' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Relatório Mensal Completo
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={exportCommissionsReport} disabled={exportingReport === 'commissions'}>
                {exportingReport === 'commissions' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Relatório de Comissões
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={exportPerformanceReport} disabled={exportingReport === 'performance'}>
                {exportingReport === 'performance' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Análise de Performance
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={exportRevenueProjection} disabled={exportingReport === 'projection'}>
                {exportingReport === 'projection' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Projeção de Receita
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
