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
import { router } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { api } from '../src/utils/api';
import { Button } from '../src/components/Button';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { formatCurrency } from '../src/utils/format';

interface PaymentResponse {
  payment_id: string;
  preference_id: string | null;
  init_point: string | null;
  sandbox_init_point?: string | null;
  sandbox_mode?: boolean;
  amount: number;
  message?: string;
}

export default function SubscriptionScreen() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const response = await api.post<PaymentResponse>('/payments/create', {
        type: 'subscription',
      });

      if (response.init_point) {
        // Open MercadoPago checkout
        Linking.openURL(response.init_point);
      } else if (response.sandbox_mode) {
        // Sandbox mode - simulate payment
        Alert.alert(
          'Modo Sandbox',
          'MercadoPago não configurado. Deseja simular o pagamento?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Simular Pagamento',
              onPress: async () => {
                try {
                  await api.post(`/payments/${response.payment_id}/simulate`, null);
                  Alert.alert('Sucesso', 'Assinatura ativada!');
                  await refreshUser();
                } catch (error: any) {
                  Alert.alert('Erro', error.message);
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao criar pagamento');
    } finally {
      setSubscribing(false);
    }
  };

  const isActive = user?.subscription_status === 'active';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assinatura</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Status Card */}
          <View style={[styles.statusCard, isActive && styles.statusCardActive]}>
            <View style={styles.statusIcon}>
              <Ionicons
                name={isActive ? 'checkmark-circle' : 'close-circle'}
                size={48}
                color={isActive ? '#10B981' : '#9CA3AF'}
              />
            </View>
            <Text style={styles.statusTitle}>
              {isActive ? 'Assinatura Ativa' : 'Sem Assinatura'}
            </Text>
            <Text style={styles.statusDesc}>
              {isActive
                ? 'Você tem acesso a todas as ofertas exclusivas'
                : 'Assine para acessar ofertas exclusivas'}
            </Text>
          </View>

          {/* Plan Card */}
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Plano Básico</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.currency}>R$</Text>
                <Text style={styles.price}>19</Text>
                <Text style={styles.cents}>,90</Text>
                <Text style={styles.period}>/mês</Text>
              </View>
            </View>

            <View style={styles.features}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Acesso a todas as ofertas do condomínio</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Descontos de até 45%</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Notificações de novas ofertas</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Suporte prioritário</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Cancele quando quiser</Text>
              </View>
            </View>

            {!isActive && (
              <Button
                title="Assinar Agora"
                onPress={handleSubscribe}
                loading={subscribing}
                style={styles.subscribeButton}
              />
            )}
          </View>

          {/* Sandbox Mode Warning */}
          <View style={styles.sandboxCard}>
            <Ionicons name="flask" size={24} color="#F59E0B" />
            <Text style={styles.sandboxText}>
              Modo de Teste - Pagamentos são simulados para fins de demonstração.
            </Text>
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#2563EB" />
            <Text style={styles.infoText}>
              Pagamento processado de forma segura via MercadoPago.
              Você pode cancelar sua assinatura a qualquer momento.
            </Text>
          </View>
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
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  statusCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  statusIcon: {
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  planName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
  },
  price: {
    fontSize: 56,
    fontWeight: '700',
    color: '#111827',
  },
  cents: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
  },
  period: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginLeft: 4,
  },
  features: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  subscribeButton: {
    width: '100%',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sandboxCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sandboxText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    marginLeft: 12,
    lineHeight: 20,
    fontWeight: '500',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2563EB',
    marginLeft: 12,
    lineHeight: 20,
  },
});
