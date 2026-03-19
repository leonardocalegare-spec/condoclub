import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/utils/api';
import { Deal, Building, Supplier, DealParticipant } from '../../src/types';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AdminDealsScreen() {
  const { user, building } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [participantsModal, setParticipantsModal] = useState(false);
  const [participants, setParticipants] = useState<DealParticipant[]>([]);
  const [participantsDeal, setParticipantsDeal] = useState<Deal | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [groupPrice, setGroupPrice] = useState('');
  const [minParticipants, setMinParticipants] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('7');
  const [serviceDays, setServiceDays] = useState('14');

  const fetchAdminData = useCallback(async () => {
    try {
      const [buildingsData, suppliersData, dealsData] = await Promise.all([
        api.get<Building[]>('/admin/buildings'),
        api.get<Supplier[]>('/admin/suppliers'),
        api.get<Deal[]>('/admin/deals'),
      ]);
      setBuildings(buildingsData);
      setSuppliers(suppliersData);
      setDeals(dealsData);

      if (!selectedBuildingId) {
        const defaultBuilding = building?.building_id || buildingsData[0]?.building_id;
        if (defaultBuilding) setSelectedBuildingId(defaultBuilding);
      }
      if (!selectedSupplierId && suppliersData[0]?.supplier_id) {
        setSelectedSupplierId(suppliersData[0].supplier_id);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao carregar dados admin');
    } finally {
      setLoading(false);
    }
  }, [selectedBuildingId, selectedSupplierId, building]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setOriginalPrice('');
    setGroupPrice('');
    setMinParticipants('');
    setMaxParticipants('');
    setDeadlineDays('7');
    setServiceDays('14');
  };

  const handleCreateDeal = async () => {
    if (!selectedBuildingId || !selectedSupplierId) {
      Alert.alert('Erro', 'Selecione prédio e fornecedor');
      return;
    }
    if (!title.trim() || !description.trim() || !category.trim()) {
      Alert.alert('Erro', 'Preencha título, descrição e categoria');
      return;
    }
    if (!originalPrice || !groupPrice || !minParticipants || !maxParticipants) {
      Alert.alert('Erro', 'Preencha preços e participantes');
      return;
    }

    const original = Number(originalPrice.replace(',', '.'));
    const group = Number(groupPrice.replace(',', '.'));
    const min = Number(minParticipants);
    const max = Number(maxParticipants);
    const deadlineInDays = Number(deadlineDays) || 7;
    const serviceInDays = Number(serviceDays) || 14;

    if (!Number.isFinite(original) || !Number.isFinite(group) || group <= 0 || original <= 0) {
      Alert.alert('Erro', 'Preços inválidos');
      return;
    }
    if (min <= 0 || max <= 0 || max < min) {
      Alert.alert('Erro', 'Participantes inválidos');
      return;
    }

    const discountPercent = Math.max(0, Math.round(((original - group) / original) * 100));
    const deadline = new Date(Date.now() + deadlineInDays * 24 * 60 * 60 * 1000).toISOString();
    const serviceDate = new Date(Date.now() + serviceInDays * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      supplier_id: selectedSupplierId,
      building_id: selectedBuildingId,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      original_price: original,
      tiers: [
        {
          min_participants: min,
          price: group,
          discount_percent: discountPercent,
        },
      ],
      min_participants: min,
      max_participants: max,
      service_date: serviceDate,
      deadline,
    };

    setCreating(true);
    try {
      await api.post('/deals', payload);
      Alert.alert('Sucesso', 'Oferta criada com sucesso');
      resetForm();
      await fetchAdminData();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao criar oferta');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (deal: Deal) => {
    const nextStatus = deal.status === 'draft' ? 'active' : 'draft';
    try {
      await api.put(`/deals/${deal.deal_id}`, { status: nextStatus });
      await fetchAdminData();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao atualizar status');
    }
  };

  const openParticipants = async (deal: Deal) => {
    try {
      const data = await api.get<Deal>(`/deals/${deal.deal_id}`);
      setParticipants(data.participants || []);
      setParticipantsDeal(data);
      setParticipantsModal(true);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao carregar participantes');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={48} color="#9CA3AF" />
          <Text style={styles.accessTitle}>Acesso restrito</Text>
          <Text style={styles.accessText}>Esta área é exclusiva para administradores.</Text>
          <Button title="Voltar" onPress={() => router.back()} style={styles.backButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Admin • Ofertas</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Criar nova oferta</Text>
            <Text style={styles.sectionSubtitle}>Crie ofertas para o piloto com poucos campos.</Text>

            <View style={styles.inlineList}>
              {buildings.map((item) => (
                <TouchableOpacity
                  key={item.building_id}
                  style={[
                    styles.chip,
                    selectedBuildingId === item.building_id && styles.chipActive,
                  ]}
                  onPress={() => setSelectedBuildingId(item.building_id)}
                >
                  <Text style={[styles.chipText, selectedBuildingId === item.building_id && styles.chipTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inlineList}>
              {suppliers.map((item) => (
                <TouchableOpacity
                  key={item.supplier_id}
                  style={[
                    styles.chip,
                    selectedSupplierId === item.supplier_id && styles.chipActive,
                  ]}
                  onPress={() => setSelectedSupplierId(item.supplier_id)}
                >
                  <Text style={[styles.chipText, selectedSupplierId === item.supplier_id && styles.chipTextActive]}>
                    {item.company_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Limpeza de sofá"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Detalhes do serviço"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Categoria</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="Ex: Limpeza"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Preço normal (R$)</Text>
                <TextInput
                  style={styles.input}
                  value={originalPrice}
                  onChangeText={setOriginalPrice}
                  keyboardType="decimal-pad"
                  placeholder="400"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Preço grupo (R$)</Text>
                <TextInput
                  style={styles.input}
                  value={groupPrice}
                  onChangeText={setGroupPrice}
                  keyboardType="decimal-pad"
                  placeholder="320"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Mín. participantes</Text>
                <TextInput
                  style={styles.input}
                  value={minParticipants}
                  onChangeText={setMinParticipants}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Máx. participantes</Text>
                <TextInput
                  style={styles.input}
                  value={maxParticipants}
                  onChangeText={setMaxParticipants}
                  keyboardType="number-pad"
                  placeholder="20"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Prazo (dias)</Text>
                <TextInput
                  style={styles.input}
                  value={deadlineDays}
                  onChangeText={setDeadlineDays}
                  keyboardType="number-pad"
                  placeholder="7"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Serviço em (dias)</Text>
                <TextInput
                  style={styles.input}
                  value={serviceDays}
                  onChangeText={setServiceDays}
                  keyboardType="number-pad"
                  placeholder="14"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <Button
              title="Criar oferta"
              onPress={handleCreateDeal}
              loading={creating}
              style={styles.createButton}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ofertas existentes</Text>
            {deals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="pricetag" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Nenhuma oferta</Text>
                <Text style={styles.emptyText}>Crie a primeira oferta do condomínio.</Text>
              </View>
            ) : (
              deals.map((deal) => (
                <View key={deal.deal_id} style={styles.dealCard}>
                  <View style={styles.dealHeader}>
                    <View style={styles.dealInfo}>
                      <Text style={styles.dealTitle}>{deal.title}</Text>
                      <Text style={styles.dealMeta}>
                        {deal.category} • {formatCurrency(deal.current_price)}
                      </Text>
                      <Text style={styles.dealMeta}>Prazo: {formatDate(deal.deadline)}</Text>
                    </View>
                    <View style={[styles.statusBadge, deal.status === 'active' && styles.statusActive]}>
                      <Text style={styles.statusText}>{deal.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.dealFooter}>
                    <Text style={styles.participantsText}>
                      {deal.current_participants}/{deal.min_participants} participantes
                    </Text>
                    <View style={styles.dealActions}>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => openParticipants(deal)}
                      >
                        <Text style={styles.smallButtonText}>Participantes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallButton, styles.outlineButton]}
                        onPress={() => handleToggleStatus(deal)}
                      >
                        <Text style={[styles.smallButtonText, styles.outlineButtonText]}>
                          {deal.status === 'draft' ? 'Ativar' : 'Rascunho'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={participantsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Participantes</Text>
              <TouchableOpacity onPress={() => setParticipantsModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {participantsDeal?.title}
            </Text>
            <ScrollView style={styles.modalList}>
              {participants.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>Sem participantes</Text>
                  <Text style={styles.emptyText}>Nenhum morador entrou ainda.</Text>
                </View>
              ) : (
                participants.map((participant) => (
                  <View key={participant.participant_id} style={styles.participantRow}>
                    <View>
                      <Text style={styles.participantName}>
                        {participant.user?.name || participant.user_id}
                      </Text>
                      <Text style={styles.participantEmail}>
                        {participant.user?.email || 'Sem e-mail'}
                      </Text>
                    </View>
                    <View style={styles.participantStatus}>
                      <Text style={styles.participantStatusText}>{participant.status}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <Button title="Fechar" onPress={() => setParticipantsModal(false)} style={styles.modalButton} />
          </View>
        </View>
      </Modal>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  inlineList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: '#2563EB',
  },
  chipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rowItem: {
    flex: 1,
  },
  createButton: {
    marginTop: 8,
  },
  dealCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dealInfo: {
    flex: 1,
    marginRight: 8,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  dealMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  statusActive: {
    backgroundColor: '#DBEAFE',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1F2937',
  },
  dealFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dealActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 10,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  outlineButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  outlineButtonText: {
    color: '#2563EB',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  modalList: {
    marginBottom: 16,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  participantEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  participantStatus: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  participantStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  modalButton: {
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  accessText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  backButton: {
    marginTop: 16,
  },
});