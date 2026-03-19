import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/utils/api';
import { Booking } from '../../src/types';
import { BookingCard } from '../../src/components/BookingCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await api.get<Booking[]>('/bookings');
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  if (loading) {
    return <LoadingScreen />;
  }

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>Minhas Reservas</Text>
      <Text style={styles.subtitle}>Acompanhe seus serviços agendados</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Nenhuma reserva</Text>
      <Text style={styles.emptyText}>Você ainda não participou de nenhuma oferta</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={activeBookings}
        keyExtractor={(item) => item.booking_id}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <BookingCard booking={item} />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          cancelledBookings.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Canceladas</Text>
              {cancelledBookings.map((booking) => (
                <View key={booking.booking_id} style={styles.cardContainer}>
                  <BookingCard booking={booking} />
                </View>
              ))}
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
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
  listContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
  },
  cardContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 12,
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
    textAlign: 'center',
  },
});
