import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Deal } from '../types';
import { formatCurrency, getTimeRemaining, getDiscountPercent } from '../utils/format';

const { width } = Dimensions.get('window');

interface DealCardProps {
  deal: Deal;
  onPress: () => void;
}

export function DealCard({ deal, onPress }: DealCardProps) {
  const progressPercent = (deal.current_participants / deal.min_participants) * 100;
  const discount = getDiscountPercent(deal.original_price, deal.current_price);
  const isActivated = deal.current_participants >= deal.min_participants;

  // 🔥 NOVA LÓGICA UX
  const current = deal.current_participants;
  const min = deal.min_participants;
  const remaining = Math.max(min - current, 0);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'limpeza': return 'sparkles';
      case 'manutenção': return 'construct';
      case 'pet': return 'paw';
      case 'jardinagem': return 'leaf';
      default: return 'pricetag';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.categoryBadge}>
          <Ionicons name={getCategoryIcon(deal.category)} size={14} color="#2563EB" />
          <Text style={styles.categoryText}>{deal.category}</Text>
        </View>

        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
      </View>

      {/* TÍTULO */}
      <Text style={styles.title} numberOfLines={2}>
        {deal.title}
      </Text>

      {/* FORNECEDOR */}
      <Text style={styles.supplier} numberOfLines={1}>
        <Ionicons name="business" size={12} color="#666" />
        {' '}{deal.supplier?.company_name || 'Fornecedor'}
      </Text>

      {/* PREÇO */}
      <View style={styles.priceRow}>
        {discount > 0 && (
          <Text style={styles.originalPrice}>
            {formatCurrency(deal.original_price)}
          </Text>
        )}
        <Text style={styles.currentPrice}>
          {formatCurrency(deal.current_price)}
        </Text>
      </View>

      {/* PROGRESSO */}
      <View style={styles.progressContainer}>
        
        {/* BARRA */}
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${Math.min(progressPercent, 100)}%` },
              isActivated && styles.progressActivated
            ]}
          />
        </View>

        {/* INFO TÉCNICA */}
        <View style={styles.progressInfo}>
          <Text style={styles.participantsText}>
            <Ionicons name="people" size={12} color="#666" />
            {' '}{current} de {min} moradores no grupo
          </Text>

          <Text style={[styles.statusText, isActivated && styles.activatedText]}>
            {isActivated ? 'Ativado!' : 'Aguardando'}
          </Text>
        </View>

        {/* 🔥 BLOCO DE CONVERSÃO (NOVO) */}
        <View style={styles.uxContainer}>

          {current > 0 && (
            <Text style={styles.socialProof}>
              🔥 {current} {current === 1 ? 'vizinho já entrou' : 'vizinhos já entraram'}
            </Text>
          )}

          {!isActivated && remaining > 0 && (
            <Text style={styles.urgency}>
              ⏳ {remaining === 1 
                ? 'Falta 1 pessoa para liberar o desconto!' 
                : `Faltam ${remaining} para liberar o desconto`}
            </Text>
          )}

          {isActivated && (
            <Text style={styles.success}>
              ✅ Desconto liberado!
            </Text>
          )}

        </View>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.timerContainer}>
          <Ionicons name="time" size={14} color="#FF6B00" />
          <Text style={styles.timerText}>
            {getTimeRemaining(deal.deadline)}
          </Text>
        </View>

        {deal.user_joined && (
          <View style={styles.joinedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.joinedText}>Participando</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  categoryText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginLeft: 4,
  },

  discountBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  supplier: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },

  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },

  currentPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },

  progressContainer: {
    marginBottom: 12,
  },

  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },

  progressActivated: {
    backgroundColor: '#10B981',
  },

  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  participantsText: {
    fontSize: 12,
    color: '#666',
  },

  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  activatedText: {
    color: '#10B981',
  },

  uxContainer: {
    marginTop: 6,
  },

  socialProof: {
    fontSize: 12,
    color: '#16a34a',
  },

  urgency: {
    fontSize: 12,
    color: '#f59e0b',
  },

  success: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },

  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  timerText: {
    fontSize: 13,
    color: '#FF6B00',
    fontWeight: '500',
    marginLeft: 4,
  },

  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  joinedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
});