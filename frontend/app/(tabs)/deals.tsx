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
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/utils/api';
import { Deal } from '../../src/types';
import { DealCard } from '../../src/components/DealCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';

const CATEGORIES = ['Todos', 'Limpeza', 'Manutenção', 'Pet', 'Jardinagem'];

export default function DealsScreen() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const fetchDeals = useCallback(async () => {
    try {
      const data = await api.get<Deal[]>('/deals');
      setDeals(data);
      filterDeals(data, selectedCategory);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  const filterDeals = (allDeals: Deal[], category: string) => {
    if (category === 'Todos') {
      setFilteredDeals(allDeals);
    } else {
      setFilteredDeals(allDeals.filter(d => d.category === category));
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    filterDeals(deals, selectedCategory);
  }, [selectedCategory, deals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDeals();
  }, [fetchDeals]);

  if (loading) {
    return <LoadingScreen />;
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>Ofertas</Text>
      <Text style={styles.subtitle}>Descubra ofertas exclusivas para seu condomínio</Text>
      
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === item && styles.categoryTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="pricetags-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Nenhuma oferta encontrada</Text>
      <Text style={styles.emptyText}>
        {selectedCategory === 'Todos'
          ? 'Não há ofertas disponíveis no momento'
          : `Não há ofertas de ${selectedCategory} no momento`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredDeals}
        keyExtractor={(item) => item.deal_id}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <DealCard
              deal={item}
              onPress={() => router.push(`/deal/${item.deal_id}`)}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
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
    paddingBottom: 0,
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
    marginBottom: 20,
  },
  categoriesList: {
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  cardContainer: {
    paddingHorizontal: 20,
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
