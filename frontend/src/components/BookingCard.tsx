import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

interface BookingCardProps {
  booking: Booking;
  onPress?: () => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: '#F59E0B', bg: '#FEF3C7', text: 'Pendente', icon: 'time' as const };
      case 'confirmed':
        return { color: '#2563EB', bg: '#DBEAFE', text: 'Confirmado', icon: 'checkmark-circle' as const };
      case 'completed':
        return { color: '#10B981', bg: '#D1FAE5', text: 'Concluído', icon: 'checkmark-done' as const };
      case 'cancelled':
        return { color: '#EF4444', bg: '#FEE2E2', text: 'Cancelado', icon: 'close-circle' as const };
      default:
        return { color: '#6B7280', bg: '#F3F4F6', text: status, icon: 'help-circle' as const };
    }
  };

  const statusConfig = getStatusConfig(booking.status);

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {booking.deal?.title || 'Reserva'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>
      </View>

      <Text style={styles.supplier} numberOfLines={1}>
        <Ionicons name="business" size={12} color="#666" />
        {' '}{booking.supplier?.company_name || 'Fornecedor'}
      </Text>

      <View style={styles.infoRow}>
        {booking.service_date && (
          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={14} color="#2563EB" />
            <Text style={styles.infoText}>{formatDate(booking.service_date)}</Text>
          </View>
        )}
        {booking.deal && (
          <View style={styles.infoItem}>
            <Text style={styles.priceText}>
              {formatCurrency(booking.deal.current_price)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 12,
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
  supplier: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 6,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
});
