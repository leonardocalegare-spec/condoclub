import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/utils/api';
import { Building } from '../../src/types';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';

export default function JoinBuildingScreen() {
  const { isAuthenticated, refreshUser, logout } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [mode, setMode] = useState<'code' | 'list'>('code');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    fetchBuildings();
  }, [isAuthenticated]);

  const fetchBuildings = async () => {
    try {
      const data = await api.get<Building[]>('/buildings');
      setBuildings(data);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Erro', 'Digite o código de convite');
      return;
    }
    if (!unitNumber.trim()) {
      Alert.alert('Erro', 'Digite o número da unidade');
      return;
    }

    setJoining(true);
    try {
      await api.post('/memberships', {
        invite_code: inviteCode.toUpperCase(),
        unit_number: unitNumber,
      });
      await refreshUser();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Código inválido');
    } finally {
      setJoining(false);
    }
  };

  const handleJoinFromList = async () => {
    if (!selectedBuilding) {
      Alert.alert('Erro', 'Selecione um condomínio');
      return;
    }
    if (!unitNumber.trim()) {
      Alert.alert('Erro', 'Digite o número da unidade');
      return;
    }

    setJoining(true);
    try {
      await api.post('/memberships', {
        building_id: selectedBuilding.building_id,
        unit_number: unitNumber,
      });
      await refreshUser();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível entrar');
    } finally {
      setJoining(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="business" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>Entre no seu Condomínio</Text>
            <Text style={styles.subtitle}>
              Para acessar as ofertas exclusivas, você precisa estar vinculado a um condomínio
            </Text>
          </View>

          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'code' && styles.modeButtonActive]}
              onPress={() => setMode('code')}
            >
              <Ionicons 
                name="key" 
                size={18} 
                color={mode === 'code' ? '#fff' : '#666'} 
              />
              <Text style={[styles.modeText, mode === 'code' && styles.modeTextActive]}>
                Código
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'list' && styles.modeButtonActive]}
              onPress={() => setMode('list')}
            >
              <Ionicons 
                name="list" 
                size={18} 
                color={mode === 'list' ? '#fff' : '#666'} 
              />
              <Text style={[styles.modeText, mode === 'list' && styles.modeTextActive]}>
                Lista
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'code' ? (
            // Code Mode
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Código de Convite</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: AURORA23"
                  placeholderTextColor="#999"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                />
                <Text style={styles.hint}>
                  Peça o código para a administração do seu condomínio
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Número da Unidade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 101, 12A"
                  placeholderTextColor="#999"
                  value={unitNumber}
                  onChangeText={setUnitNumber}
                />
              </View>

              <Button
                title="Entrar no Condomínio"
                onPress={handleJoinWithCode}
                loading={joining}
                style={styles.submitButton}
              />
            </View>
          ) : (
            // List Mode
            <View style={styles.formSection}>
              <Text style={styles.listLabel}>Selecione seu Condomínio</Text>
              
              <View style={styles.buildingsList}>
                {buildings.map((building) => (
                  <TouchableOpacity
                    key={building.building_id}
                    style={[
                      styles.buildingItem,
                      selectedBuilding?.building_id === building.building_id && styles.buildingItemSelected,
                    ]}
                    onPress={() => setSelectedBuilding(building)}
                  >
                    <View style={styles.buildingIcon}>
                      <Ionicons 
                        name="business" 
                        size={24} 
                        color={selectedBuilding?.building_id === building.building_id ? '#2563EB' : '#666'} 
                      />
                    </View>
                    <View style={styles.buildingInfo}>
                      <Text style={styles.buildingName}>{building.name}</Text>
                      <Text style={styles.buildingAddress}>{building.address}</Text>
                      <Text style={styles.buildingCity}>{building.city}, {building.state}</Text>
                    </View>
                    {selectedBuilding?.building_id === building.building_id && (
                      <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {selectedBuilding && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Número da Unidade</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 101, 12A"
                    placeholderTextColor="#999"
                    value={unitNumber}
                    onChangeText={setUnitNumber}
                  />
                </View>
              )}

              <Button
                title="Entrar no Condomínio"
                onPress={handleJoinFromList}
                loading={joining}
                disabled={!selectedBuilding}
                style={styles.submitButton}
              />
            </View>
          )}

          {/* Logout Link */}
          <TouchableOpacity style={styles.logoutLink} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#666" />
            <Text style={styles.logoutText}>Sair e trocar de conta</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: '#2563EB',
  },
  modeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  modeTextActive: {
    color: '#fff',
  },
  formSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  listLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  buildingsList: {
    marginBottom: 20,
  },
  buildingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  buildingItemSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  buildingIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buildingInfo: {
    flex: 1,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  buildingAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  buildingCity: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  submitButton: {
    marginTop: 8,
  },
  logoutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logoutText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
});
