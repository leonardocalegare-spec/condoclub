import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/utils/api';
import { Deal, Booking } from '../../src/types';
import { DealCard } from '../../src/components/DealCard';
import { BookingCard } from '../../src/components/BookingCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';

export default function HomeScreen() {
  const { user, building, membership } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dealsData, bookingsData] = await Promise.all([
        api.get<Deal[]>('/deals'),
        api.get<Booking[]>('/bookings'),
      ]);
      setDeals(dealsData.slice(0, 3)); // Show top 3 deals
      setBookings(bookingsData.filter(b => b.status !== 'cancelled').slice(0, 3)); // Show top 3 bookings
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}!</Text>
            <Text style={styles.buildingName}>{building?.name}</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Building Card */}
        <View style={styles.buildingCard}>
          <View style={styles.buildingIconContainer}>
            <Ionicons name="business" size={32} color="#2563EB" />
          </View>
          <View style={styles.buildingInfo}>
            <Text style={styles.buildingCardTitle}>{building?.name}</Text>
            <Text style={styles.buildingCardAddress}>{building?.address}</Text>
            <Text style={styles.buildingCardUnit}>Unidade {membership?.unit_number}</Text>
          </View>
          <View style={styles.inviteCode}>
            <Text style={styles.inviteLabel}>Código</Text>
            <Text style={styles.inviteCodeText}>{building?.invite_code}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="pricetags" size={24} color="#10B981" />
            <Text style={styles.statValue}>{deals.length}</Text>
            <Text style={styles.statLabel}>Ofertas Ativas</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#2563EB" />
            <Text style={styles.statValue}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Minhas Reservas</Text>
          </View>
        </View>

        {/* Upcoming Bookings */}
        {bookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Próximos Serviços</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
                <Text style={styles.seeAll}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            {bookings.map((booking) => (
              <BookingCard key={booking.booking_id} booking={booking} />
            ))}
          </View>
        )}

        {/* Active Deals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ofertas em Destaque</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/deals')}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {deals.length > 0 ? (
            deals.map((deal) => (
              <DealCard
                key={deal.deal_id}
                deal={deal}
                onPress={() => router.push(`/deal/${deal.deal_id}`)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="pricetags-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma oferta disponível no momento</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  buildingName: {
    fontSize: 14,
    color: '#666',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buildingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  buildingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buildingInfo: {
    flex: 1,
  },
  buildingCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  buildingCardAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  buildingCardUnit: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  inviteCode: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  inviteLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  inviteCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  seeAll: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
});
