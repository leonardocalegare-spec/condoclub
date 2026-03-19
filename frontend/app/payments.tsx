import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../src/utils/api';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { formatCurrency, formatDateTime } from '../src/utils/format';

interface Payment {
  payment_id: string;
  user_id: string;
  deal_id?: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      const data = await api.get<Payment[]>('/payments');
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayments();
  }, [fetchPayments]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { color: '#10B981', bg: '#D1FAE5', text: 'Aprovado', icon: 'checkmark-circle' as const };
      case 'pending':
        return { color: '#F59E0B', bg: '#FEF3C7', text: 'Pendente', icon: 'time' as const };
      case 'rejected':
        return { color: '#EF4444', bg: '#FEE2E2', text: 'Rejeitado', icon: 'close-circle' as const };
      default:
        return { color: '#6B7280', bg: '#F3F4F6', text: status, icon: 'help-circle' as const };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription':
        return 'Assinatura';
      case 'deal_payment':
        return 'Pagamento de Oferta';
      default:
        return type;
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const renderPayment = ({ item }: { item: Payment }) => {
    const statusConfig = getStatusConfig(item.status);
    
    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={styles.typeContainer}>
            <Ionicons
              name={item.type === 'subscription' ? 'card' : 'pricetag'}
              size={20}
              color="#2563EB"
            />
            <Text style={styles.typeText}>{getTypeLabel(item.type)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
        </View>

        <View style={styles.paymentDetails}>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
        </View>

        <Text style={styles.paymentId}>ID: {item.payment_id}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico de Pagamentos</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.payment_id}
        renderItem={renderPayment}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhum pagamento</Text>
            <Text style={styles.emptyText}>Seus pagamentos aparecerão aqui</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  listContent: {
    padding: 20,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  date: {
    fontSize: 13,
    color: '#666',
  },
  paymentId: {
    fontSize: 11,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
