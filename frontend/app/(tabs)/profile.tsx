import React, { useState } from 'react';
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
import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/components/Button';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ProfileScreen() {
  const { user, building, membership, logout, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir Conta',
      'Tem certeza que deseja excluir sua conta? Esta ação é irreversível e todos os seus dados serão permanentemente removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar Exclusão',
              'Digite "EXCLUIR" para confirmar a exclusão da sua conta.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmar',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                      Alert.alert('Conta Excluída', 'Sua conta foi excluída com sucesso.');
                      router.replace('/');
                    } catch (error: any) {
                      Alert.alert('Erro', error.message || 'Falha ao excluir conta');
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const openPrivacyPolicy = () => {
    Linking.openURL(`${API_URL}/api/legal/privacy`);
  };

  const openTerms = () => {
    Linking.openURL(`${API_URL}/api/legal/terms`);
  };

  const MenuItem = ({ icon, title, subtitle, onPress, danger }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!onPress}>
      <View style={[styles.menuIconContainer, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={22} color={danger ? '#DC2626' : '#2563EB'} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, danger && styles.dangerText]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.badges}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user?.role === 'admin' ? 'Administrador' : 
                   user?.role === 'supplier' ? 'Fornecedor' : 'Morador'}
                </Text>
              </View>
              <View style={[styles.authBadge, user?.auth_provider === 'google' && styles.googleBadge]}>
                <Ionicons 
                  name={user?.auth_provider === 'google' ? 'logo-google' : 'mail'} 
                  size={12} 
                  color={user?.auth_provider === 'google' ? '#4285F4' : '#666'} 
                />
              </View>
            </View>
          </View>
        </View>

        {/* Building Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meu Condomínio</Text>
          <View style={styles.card}>
            <MenuItem
              icon="business"
              title={building?.name || 'Condomínio'}
              subtitle={`Unidade ${membership?.unit_number} • ${building?.address}`}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="key"
              title="Código de Convite"
              subtitle={building?.invite_code}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <View style={styles.card}>
            <MenuItem
              icon="card"
              title="Assinatura"
              subtitle={user?.subscription_status === 'active' ? 'Ativa - R$ 19,90/mês' : 'Inativa'}
              onPress={() => router.push('/subscription')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="receipt"
              title="Histórico de Pagamentos"
              onPress={() => router.push('/payments')}
            />
          </View>
        </View>

        {user?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin</Text>
            <View style={styles.card}>
              <MenuItem
                icon="pricetags"
                title="Gerenciar ofertas"
                subtitle="Criar e ativar ofertas do condomínio"
                onPress={() => router.push('/admin/deals')}
              />
            </View>
          </View>
        )}

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.card}>
            <MenuItem
              icon="document-text"
              title="Política de Privacidade"
              onPress={openPrivacyPolicy}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="document"
              title="Termos de Uso"
              onPress={openTerms}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <View style={styles.card}>
            <MenuItem
              icon="log-out"
              title="Sair da conta"
              onPress={handleLogout}
              danger
            />
            <View style={styles.divider} />
            <MenuItem
              icon="trash"
              title="Excluir conta"
              subtitle="Remove permanentemente todos os seus dados"
              onPress={handleDeleteAccount}
              danger
            />
          </View>
        </View>

        <Text style={styles.version}>CondoClub v2.0.0</Text>
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
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  authBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  googleBadge: {
    backgroundColor: '#E8F0FE',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: '#FEE2E2',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  dangerText: {
    color: '#DC2626',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68,
  },
  version: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
  },
});
