import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '../../src/utils/api';
import { Deal, DealTier, Booking } from '../../src/types';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { formatCurrency, formatDate, getTimeRemaining, getDiscountPercent } from '../../src/utils/format';

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchDeal = async () => {
    try {
      const data = await api.get<Deal>(`/deals/${id}`);
      setDeal(data);
    } catch (error) {
      console.error('Error fetching deal:', error);
      Alert.alert('Erro', 'Não foi possível carregar a oferta');
    } finally {
      setLoading(false);
    }
  };

  const fetchBooking = async () => {
    try {
      const bookings = await api.get<Booking[]>('/bookings');
      const matched = bookings.find((item) => item.deal_id === id && item.status !== 'cancelled');
      setBooking(matched || null);
    } catch (error) {
      console.error('Error fetching booking:', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDeal();
      fetchBooking();
    }
  }, [id]);

  const handleJoin = async () => {
    if (!deal) return;
    
    setJoining(true);
    try {
      await api.post(`/deals/${deal.deal_id}/join`);
      Alert.alert('Sucesso!', 'Você entrou na oferta. Acompanhe o progresso!');
      fetchDeal();
      fetchBooking();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível participar');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!deal) return;
    
    Alert.alert(
      'Sair da Oferta',
      'Tem certeza que deseja sair desta oferta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await api.post(`/deals/${deal.deal_id}/leave`);
              Alert.alert('Pronto', 'Você saiu da oferta');
              fetchDeal();
              fetchBooking();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível sair');
            } finally {
              setLeaving(false);
            }
          },
        },
      ]
    );
  };

  const handleDealPayment = async () => {
    if (!deal) return;
    setPaymentLoading(true);
    try {
      const response = await api.post<{
        payment_id: string;
        init_point: string | null;
        sandbox_mode?: boolean;
        sandbox_init_point?: string | null;
      }>('/payments/create', {
        type: 'deal_payment',
        deal_id: deal.deal_id,
      });

      if (response.init_point) {
        await Linking.openURL(response.init_point);
      } else if (response.sandbox_mode) {
        Alert.alert(
          'Modo Sandbox',
          'MercadoPago não configurado. Deseja simular o pagamento agora?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Simular Pagamento',
              onPress: async () => {
                try {
                  await api.post(`/payments/${response.payment_id}/simulate`, null);
                  Alert.alert('Pagamento aprovado', 'Reserva confirmada!');
                  await fetchBooking();
                } catch (error: any) {
                  Alert.alert('Erro', error.message || 'Falha ao simular pagamento');
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao iniciar pagamento');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading || !deal) {
    return <LoadingScreen />;
  }

  const discount = getDiscountPercent(deal.original_price, deal.current_price);
  const progressPercent = (deal.current_participants / deal.min_participants) * 100;
  const isActivated = deal.current_participants >= deal.min_participants;
  const isExpired = new Date(deal.deadline) < new Date();

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'limpeza': return 'sparkles';
      case 'manutenção': return 'construct';
      case 'pet': return 'paw';
      case 'jardinagem': return 'leaf';
      default: return 'pricetag';
    }
  };

  const sortedTiers = [...deal.tiers].sort((a, b) => a.min_participants - b.min_participants);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da Oferta</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Category & Status */}
          <View style={styles.badges}>
            <View style={styles.categoryBadge}>
              <Ionicons name={getCategoryIcon(deal.category)} size={14} color="#2563EB" />
              <Text style={styles.categoryText}>{deal.category}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
            {deal.user_joined && (
              <View style={styles.joinedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.joinedText}>Participando</Text>
              </View>
            )}
          </View>

          {/* Title & Supplier */}
          <Text style={styles.title}>{deal.title}</Text>
          <View style={styles.supplierRow}>
            <Ionicons name="business" size={16} color="#666" />
            <Text style={styles.supplierName}>{deal.supplier?.company_name}</Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            {discount > 0 && (
              <Text style={styles.originalPrice}>{formatCurrency(deal.original_price)}</Text>
            )}
            <Text style={styles.currentPrice}>{formatCurrency(deal.current_price)}</Text>
            <Text style={styles.priceNote}>preço atual por pessoa</Text>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Progresso da Oferta</Text>
              <Text style={[styles.statusText, isActivated && styles.activatedText]}>
                {isActivated ? 'Ativado!' : 'Aguardando participantes'}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min(progressPercent, 100)}%` },
                  isActivated && styles.progressActivated
                ]} 
              />
            </View>
            <View style={styles.progressInfo}>
              <View style={styles.participantsInfo}>
                <Ionicons name="people" size={18} color="#2563EB" />
                <Text style={styles.participantsCount}>{deal.current_participants}</Text>
                <Text style={styles.participantsLabel}>de {deal.min_participants} mínimo</Text>
              </View>
              <View style={styles.timerInfo}>
                <Ionicons name="time" size={18} color="#FF6B00" />
                <Text style={styles.timerText}>{getTimeRemaining(deal.deadline)}</Text>
              </View>
            </View>
          </View>

          {/* Tiers */}
          <View style={styles.tiersSection}>
            <Text style={styles.sectionTitle}>Níveis de Desconto</Text>
            <Text style={styles.sectionSubtitle}>Quanto mais participantes, maior o desconto!</Text>
            {sortedTiers.map((tier, index) => {
              const isCurrentTier = deal.current_participants >= tier.min_participants &&
                (index === sortedTiers.length - 1 || deal.current_participants < sortedTiers[index + 1].min_participants);
              const isReached = deal.current_participants >= tier.min_participants;
              
              return (
                <View 
                  key={index} 
                  style={[
                    styles.tierCard,
                    isCurrentTier && styles.tierCardActive,
                    isReached && styles.tierCardReached
                  ]}
                >
                  <View style={styles.tierLeft}>
                    <View style={[styles.tierIcon, isReached && styles.tierIconReached]}>
                      <Ionicons 
                        name={isReached ? 'checkmark-circle' : 'people'} 
                        size={20} 
                        color={isReached ? '#10B981' : '#666'} 
                      />
                    </View>
                    <View>
                      <Text style={styles.tierParticipants}>{tier.min_participants}+ participantes</Text>
                      <Text style={styles.tierDiscount}>-{tier.discount_percent}% de desconto</Text>
                    </View>
                  </View>
                  <Text style={[styles.tierPrice, isCurrentTier && styles.tierPriceActive]}>
                    {formatCurrency(tier.price)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Sobre o Serviço</Text>
            <Text style={styles.description}>{deal.description}</Text>
          </View>

          {/* Service Date */}
          {deal.service_date && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#2563EB" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Data do Serviço</Text>
                <Text style={styles.infoValue}>{formatDate(deal.service_date)}</Text>
              </View>
            </View>
          )}

          {/* Deadline */}
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color="#FF6B00" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Encerramento</Text>
              <Text style={styles.infoValue}>{formatDate(deal.deadline)}</Text>
            </View>
          </View>

          {booking && (
            <View style={styles.infoRow}>
              <Ionicons
                name={booking.status === 'confirmed' ? 'checkmark-circle' : 'time'}
                size={20}
                color={booking.status === 'confirmed' ? '#2563EB' : '#F59E0B'}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status da Reserva</Text>
                <Text style={styles.infoValue}>
                  {booking.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
                </Text>
              </View>
            </View>
          )}

          {/* Supplier Info */}
          {deal.supplier && (
            <View style={styles.supplierSection}>
              <Text style={styles.sectionTitle}>Fornecedor</Text>
              <View style={styles.supplierCard}>
                <View style={styles.supplierIcon}>
                  <Ionicons name="business" size={24} color="#2563EB" />
                </View>
                <View style={styles.supplierInfo}>
                  <Text style={styles.supplierCompany}>{deal.supplier.company_name}</Text>
                  <Text style={styles.supplierDesc}>{deal.supplier.description}</Text>
                  {deal.supplier.phone && (
                    <View style={styles.contactRow}>
                      <Ionicons name="call" size={14} color="#666" />
                      <Text style={styles.contactText}>{deal.supplier.phone}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action */}
      {!isExpired && ['active', 'locked'].includes(deal.status) && (
        <View style={styles.bottomAction}>
          {deal.user_joined ? (
            booking?.status === 'confirmed' ? (
              <Button
                title="Reserva Confirmada"
                onPress={() => {}}
                disabled
                style={styles.actionButton}
              />
            ) : (
              <View style={styles.actionStack}>
                <Button
                  title="Simular Pagamento"
                  onPress={handleDealPayment}
                  loading={paymentLoading}
                  style={styles.actionButton}
                />
                <Button
                  title="Sair da Oferta"
                  onPress={handleLeave}
                  variant="outline"
                  loading={leaving}
                  style={styles.actionButton}
                />
              </View>
            )
          ) : (
            <Button
              title="Participar da Oferta"
              onPress={handleJoin}
              loading={joining}
              style={styles.actionButton}
            />
          )}
        </View>
      )}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
    marginLeft: 4,
  },
  discountBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  joinedText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  supplierName: {
    fontSize: 15,
    color: '#666',
    marginLeft: 6,
  },
  priceContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#10B981',
  },
  priceNote: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  progressSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  activatedText: {
    color: '#10B981',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  progressActivated: {
    backgroundColor: '#10B981',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 6,
  },
  participantsLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  timerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '500',
    marginLeft: 6,
  },
  tiersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  tierCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tierCardActive: {
    borderColor: '#2563EB',
  },
  tierCardReached: {
    backgroundColor: '#F0FDF4',
  },
  tierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tierIconReached: {
    backgroundColor: '#D1FAE5',
  },
  tierParticipants: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  tierDiscount: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  tierPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  tierPriceActive: {
    color: '#2563EB',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoContent: {
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  supplierSection: {
    marginTop: 12,
  },
  supplierCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  supplierIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierCompany: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  supplierDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionStack: {
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
});
