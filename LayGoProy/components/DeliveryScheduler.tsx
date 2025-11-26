import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { deliveryAddressesService } from '../services/deliveryAddressesService';
import { DeliveryAddress } from '../data/userStorage';

interface DeliverySchedule {
  id: string;
  date: string;
  timeSlot: string;
  address: string;
  notes?: string;
}

interface DeliverySchedulerProps {
  visible: boolean;
  onClose: () => void;
  onSchedule: (schedule: DeliverySchedule) => void;
  existingSchedule?: DeliverySchedule;
}

const timeSlots = [
  { id: 'morning', label: 'Mañana (8:00 - 12:00)', icon: '🌅' },
  { id: 'afternoon', label: 'Tarde (12:00 - 17:00)', icon: '☀️' },
  { id: 'evening', label: 'Noche (17:00 - 20:00)', icon: '🌆' },
];

const deliveryAreas = [
  { id: 'lima-centro', name: 'Lima Centro', fee: 0 },
  { id: 'lima-norte', name: 'Lima Norte', fee: 5 },
  { id: 'lima-sur', name: 'Lima Sur', fee: 5 },
  { id: 'lima-este', name: 'Lima Este', fee: 8 },
  { id: 'callao', name: 'Callao', fee: 3 },
  { id: 'provincias', name: 'Provincias', fee: 15 },
];

export default function DeliveryScheduler({
  visible,
  onClose,
  onSchedule,
  existingSchedule,
}: DeliverySchedulerProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    existingSchedule?.date || new Date().toISOString().split('T')[0]
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(
    existingSchedule?.timeSlot || ''
  );
  const [selectedArea, setSelectedArea] = useState('');
  const [address, setAddress] = useState(existingSchedule?.address || '');
  const [notes, setNotes] = useState(existingSchedule?.notes || '');
  const [step, setStep] = useState(1);
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    address: '',
    zone: '',
    notes: '',
  });
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  // Cargar direcciones guardadas cuando se abre el modal
  useEffect(() => {
    if (visible && user?.id) {
      loadSavedAddresses();
    }
  }, [visible, user?.id]);

  const loadSavedAddresses = async (): Promise<DeliveryAddress[]> => {
    if (!user?.id) return [];
    
    setIsLoadingAddresses(true);
    try {
      const addresses = await deliveryAddressesService.getAddresses(user.id);
      setSavedAddresses(addresses);
      
      // Si hay una dirección por defecto, seleccionarla automáticamente
      const defaultAddress = addresses.find(addr => addr.isDefault);
      if (defaultAddress && !selectedAddressId) {
        setSelectedAddressId(defaultAddress.id);
        setAddress(defaultAddress.address);
        setNotes(defaultAddress.notes || '');
        setSelectedArea(defaultAddress.zone || '');
      }
      
      return addresses;
    } catch (error) {
      console.error('Error loading addresses:', error);
      return [];
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Determinar el número máximo de pasos según si hay direcciones guardadas
  // Usar useMemo para recalcular cuando cambien las direcciones
  const maxSteps = React.useMemo(() => {
    return savedAddresses.length > 0 ? 4 : 5;
  }, [savedAddresses.length]);

  const handleNext = () => {
    if (step === 1 && !selectedDate) {
      Alert.alert('Error', 'Por favor selecciona una fecha');
      return;
    }
    if (step === 2 && !selectedTimeSlot) {
      Alert.alert('Error', 'Por favor selecciona un horario');
      return;
    }
    
    // Si hay direcciones guardadas, el paso 3 es selección de dirección
    if (savedAddresses.length > 0) {
      if (step === 3 && !selectedAddressId && !showAddAddress) {
        Alert.alert('Error', 'Por favor selecciona una dirección o añade una nueva');
        return;
      }
      if (step === 3 && showAddAddress && !newAddressForm.address.trim()) {
        Alert.alert('Error', 'Por favor ingresa la dirección de entrega');
        return;
      }
    } else {
      // Flujo sin direcciones guardadas
      if (step === 3 && !selectedArea) {
        Alert.alert('Error', 'Por favor selecciona una zona de entrega');
        return;
      }
      if (step === 4 && !address.trim()) {
        Alert.alert('Error', 'Por favor ingresa la dirección de entrega');
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSelectAddress = (addr: DeliveryAddress) => {
    setSelectedAddressId(addr.id);
    setAddress(addr.address);
    setNotes(addr.notes || '');
    setSelectedArea(addr.zone || '');
    setShowAddAddress(false);
  };

  const handleAddNewAddress = async () => {
    if (!newAddressForm.address.trim()) {
      Alert.alert('Error', 'Por favor ingresa la dirección');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    try {
      const addressId = await deliveryAddressesService.saveAddress(user.id, {
        address: newAddressForm.address.trim(),
        zone: newAddressForm.zone || undefined,
        notes: newAddressForm.notes || undefined,
        isDefault: false,
      });

      if (addressId) {
        // Recargar direcciones y obtener la lista actualizada
        const updatedAddresses = await loadSavedAddresses();
        // Seleccionar la nueva dirección
        const newAddress = updatedAddresses.find(addr => addr.id === addressId) || {
          id: addressId,
          address: newAddressForm.address.trim(),
          zone: newAddressForm.zone || undefined,
          notes: newAddressForm.notes || undefined,
          isDefault: false,
        };
        handleSelectAddress(newAddress);
        setNewAddressForm({ address: '', zone: '', notes: '' });
        setShowAddAddress(false);
      } else {
        Alert.alert('Error', 'No se pudo guardar la dirección');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'No se pudo guardar la dirección');
    }
  };

  const handleConfirm = () => {
    const selectedTimeData = timeSlots.find(slot => slot.id === selectedTimeSlot);
    
    if (!selectedTimeData) {
      Alert.alert('Error', 'Información incompleta');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Error', 'Por favor selecciona o ingresa una dirección');
      return;
    }

    const schedule: DeliverySchedule = {
      id: existingSchedule?.id || Date.now().toString(),
      date: selectedDate,
      timeSlot: selectedTimeData.label,
      address: address.trim(),
      notes: notes.trim() || undefined,
    };

    onSchedule(schedule);
    onClose();
    
    // Reset form
    setStep(1);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedTimeSlot('');
    setSelectedArea('');
    setAddress('');
    setNotes('');
    setSelectedAddressId(null);
    setShowAddAddress(false);
    setNewAddressForm({ address: '', zone: '', notes: '' });
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Selecciona la Fecha</Text>
      <Text style={styles.stepDescription}>
        Elige cuándo quieres recibir tu pedido
      </Text>
      
      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>Fecha de entrega:</Text>
        <TextInput
          style={styles.dateInput}
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numeric"
        />
        <Text style={styles.dateNote}>
          * Mínimo 24 horas de anticipación
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Selecciona el Horario</Text>
      <Text style={styles.stepDescription}>
        Elige tu horario preferido de entrega
      </Text>
      
      <View style={styles.timeSlotsContainer}>
        {timeSlots.map((slot) => (
          <TouchableOpacity
            key={slot.id}
            style={[
              styles.timeSlotButton,
              selectedTimeSlot === slot.id && styles.timeSlotButtonActive
            ]}
            onPress={() => setSelectedTimeSlot(slot.id)}
          >
            <Text style={styles.timeSlotIcon}>{slot.icon}</Text>
            <Text style={[
              styles.timeSlotText,
              selectedTimeSlot === slot.id && styles.timeSlotTextActive
            ]}>
              {slot.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => {
    // Si hay direcciones guardadas, mostrar selección de dirección
    if (savedAddresses.length > 0) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Selecciona Dirección de Entrega</Text>
          <Text style={styles.stepDescription}>
            Elige una dirección guardada o añade una nueva
          </Text>
          
          {isLoadingAddresses ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Cargando direcciones...</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.addressesList} showsVerticalScrollIndicator={false}>
                {savedAddresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.addressCard,
                      selectedAddressId === addr.id && styles.addressCardActive
                    ]}
                    onPress={() => handleSelectAddress(addr)}
                  >
                    <View style={styles.addressCardContent}>
                      <View style={styles.addressHeader}>
                        <Ionicons 
                          name="location" 
                          size={20} 
                          color={selectedAddressId === addr.id ? Colors.light.background : Colors.light.primary} 
                        />
                        {addr.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Por defecto</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.addressText,
                        selectedAddressId === addr.id && styles.addressTextActive
                      ]}>
                        {addr.address}
                      </Text>
                      {addr.zone && (
                        <Text style={[
                          styles.addressZone,
                          selectedAddressId === addr.id && styles.addressZoneActive
                        ]}>
                          {deliveryAreas.find(a => a.id === addr.zone)?.name || addr.zone}
                        </Text>
                      )}
                      {addr.notes && (
                        <Text style={[
                          styles.addressNotes,
                          selectedAddressId === addr.id && styles.addressNotesActive
                        ]}>
                          {addr.notes}
                        </Text>
                      )}
                    </View>
                    {selectedAddressId === addr.id && (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.light.background} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {!showAddAddress ? (
                <TouchableOpacity
                  style={styles.addAddressButton}
                  onPress={() => setShowAddAddress(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={Colors.light.primary} />
                  <Text style={styles.addAddressButtonText}>Añadir Nueva Dirección</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.newAddressForm}>
                  <Text style={styles.inputLabel}>Dirección completa:</Text>
                  <TextInput
                    style={styles.addressInput}
                    value={newAddressForm.address}
                    onChangeText={(text) => setNewAddressForm({ ...newAddressForm, address: text })}
                    placeholder="Ej: Av. Arequipa 123, Miraflores, Lima"
                    multiline
                    numberOfLines={3}
                  />
                  
                  <Text style={styles.inputLabel}>Zona (opcional):</Text>
                  <View style={styles.zonesContainer}>
                    {deliveryAreas.map((area) => (
                      <TouchableOpacity
                        key={area.id}
                        style={[
                          styles.zoneChip,
                          newAddressForm.zone === area.id && styles.zoneChipActive
                        ]}
                        onPress={() => setNewAddressForm({ ...newAddressForm, zone: area.id })}
                      >
                        <Text style={[
                          styles.zoneChipText,
                          newAddressForm.zone === area.id && styles.zoneChipTextActive
                        ]}>
                          {area.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <Text style={styles.inputLabel}>Notas adicionales (opcional):</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={newAddressForm.notes}
                    onChangeText={(text) => setNewAddressForm({ ...newAddressForm, notes: text })}
                    placeholder="Instrucciones especiales para la entrega..."
                    multiline
                    numberOfLines={2}
                  />
                  
                  <View style={styles.newAddressActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowAddAddress(false);
                        setNewAddressForm({ address: '', zone: '', notes: '' });
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveAddressButton}
                      onPress={handleAddNewAddress}
                    >
                      <Text style={styles.saveAddressButtonText}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      );
    }

    // Si no hay direcciones guardadas, mostrar selección de zona (flujo original)
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Selecciona la Zona</Text>
        <Text style={styles.stepDescription}>
          Elige tu zona de entrega para calcular el costo
        </Text>
        
        <View style={styles.areasContainer}>
          {deliveryAreas.map((area) => (
            <TouchableOpacity
              key={area.id}
              style={[
                styles.areaButton,
                selectedArea === area.id && styles.areaButtonActive
              ]}
              onPress={() => setSelectedArea(area.id)}
            >
              <View style={styles.areaInfo}>
                <Text style={[
                  styles.areaName,
                  selectedArea === area.id && styles.areaNameActive
                ]}>
                  {area.name}
                </Text>
                <Text style={[
                  styles.areaFee,
                  selectedArea === area.id && styles.areaFeeActive
                ]}>
                  {area.fee === 0 ? 'Gratis' : `+S/ ${area.fee}`}
                </Text>
              </View>
              {selectedArea === area.id && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.light.background} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderStep4 = () => {
    // Si hay direcciones guardadas, el paso 4 es confirmación
    if (savedAddresses.length > 0) {
      const selectedTimeData = timeSlots.find(slot => slot.id === selectedTimeSlot);
      const selectedAddressData = savedAddresses.find(addr => addr.id === selectedAddressId);
      const selectedAreaData = selectedAddressData?.zone 
        ? deliveryAreas.find(area => area.id === selectedAddressData.zone)
        : null;
      
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Confirmar Entrega</Text>
          <Text style={styles.stepDescription}>
            Revisa los detalles de tu entrega programada
          </Text>
          
          <View style={styles.confirmationContainer}>
            <View style={styles.confirmationItem}>
              <Ionicons name="calendar" size={20} color={Colors.light.primary} />
              <View style={styles.confirmationText}>
                <Text style={styles.confirmationLabel}>Fecha:</Text>
                <Text style={styles.confirmationValue}>
                  {new Date(selectedDate).toLocaleDateString('es-PE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>
            
            <View style={styles.confirmationItem}>
              <Ionicons name="time" size={20} color={Colors.light.primary} />
              <View style={styles.confirmationText}>
                <Text style={styles.confirmationLabel}>Horario:</Text>
                <Text style={styles.confirmationValue}>
                  {selectedTimeData?.label}
                </Text>
              </View>
            </View>
            
            {selectedAreaData && (
              <View style={styles.confirmationItem}>
                <Ionicons name="location" size={20} color={Colors.light.primary} />
                <View style={styles.confirmationText}>
                  <Text style={styles.confirmationLabel}>Zona:</Text>
                  <Text style={styles.confirmationValue}>
                    {selectedAreaData.name} {selectedAreaData.fee === 0 ? '(Gratis)' : `(+S/ ${selectedAreaData.fee})`}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.confirmationItem}>
              <Ionicons name="home" size={20} color={Colors.light.primary} />
              <View style={styles.confirmationText}>
                <Text style={styles.confirmationLabel}>Dirección:</Text>
                <Text style={styles.confirmationValue}>{address}</Text>
              </View>
            </View>
            
            {notes && (
              <View style={styles.confirmationItem}>
                <Ionicons name="document-text" size={20} color={Colors.light.primary} />
                <View style={styles.confirmationText}>
                  <Text style={styles.confirmationLabel}>Notas:</Text>
                  <Text style={styles.confirmationValue}>{notes}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      );
    }

    // Si no hay direcciones guardadas, el paso 4 es dirección manual
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Dirección de Entrega</Text>
        <Text style={styles.stepDescription}>
          Ingresa la dirección completa donde quieres recibir tu pedido
        </Text>
        
        <View style={styles.addressContainer}>
          <Text style={styles.inputLabel}>Dirección completa:</Text>
          <TextInput
            style={styles.addressInput}
            value={address}
            onChangeText={setAddress}
            placeholder="Ej: Av. Arequipa 123, Miraflores, Lima"
            multiline
            numberOfLines={3}
          />
          
          <Text style={styles.inputLabel}>Notas adicionales (opcional):</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Instrucciones especiales para la entrega..."
            multiline
            numberOfLines={2}
          />
        </View>
      </View>
    );
  };

  const renderStep5 = () => {
    const selectedAreaData = deliveryAreas.find(area => area.id === selectedArea);
    const selectedTimeData = timeSlots.find(slot => slot.id === selectedTimeSlot);
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Confirmar Entrega</Text>
        <Text style={styles.stepDescription}>
          Revisa los detalles de tu entrega programada
        </Text>
        
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationItem}>
            <Ionicons name="calendar" size={20} color={Colors.light.primary} />
            <View style={styles.confirmationText}>
              <Text style={styles.confirmationLabel}>Fecha:</Text>
              <Text style={styles.confirmationValue}>
                {new Date(selectedDate).toLocaleDateString('es-PE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
          </View>
          
          <View style={styles.confirmationItem}>
            <Ionicons name="time" size={20} color={Colors.light.primary} />
            <View style={styles.confirmationText}>
              <Text style={styles.confirmationLabel}>Horario:</Text>
              <Text style={styles.confirmationValue}>
                {selectedTimeData?.label}
              </Text>
            </View>
          </View>
          
          <View style={styles.confirmationItem}>
            <Ionicons name="location" size={20} color={Colors.light.primary} />
            <View style={styles.confirmationText}>
              <Text style={styles.confirmationLabel}>Zona:</Text>
              <Text style={styles.confirmationValue}>
                {selectedAreaData?.name} {selectedAreaData?.fee === 0 ? '(Gratis)' : `(+S/ ${selectedAreaData?.fee})`}
              </Text>
            </View>
          </View>
          
          <View style={styles.confirmationItem}>
            <Ionicons name="home" size={20} color={Colors.light.primary} />
            <View style={styles.confirmationText}>
              <Text style={styles.confirmationLabel}>Dirección:</Text>
              <Text style={styles.confirmationValue}>{address}</Text>
            </View>
          </View>
          
          {notes && (
            <View style={styles.confirmationItem}>
              <Ionicons name="document-text" size={20} color={Colors.light.primary} />
              <View style={styles.confirmationText}>
                <Text style={styles.confirmationLabel}>Notas:</Text>
                <Text style={styles.confirmationValue}>{notes}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Programar Entrega</Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepIndicatorText}>{step}/{maxSteps}</Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {renderCurrentStep()}
        </ScrollView>

        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
              <Ionicons name="chevron-back" size={20} color={Colors.light.primary} />
              <Text style={styles.previousButtonText}>Anterior</Text>
            </TouchableOpacity>
          )}
          
          {step < maxSteps ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Siguiente</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.light.background} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Ionicons name="checkmark" size={20} color={Colors.light.background} />
              <Text style={styles.confirmButtonText}>Confirmar Entrega</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
  },
  stepIndicator: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  stepIndicatorText: {
    color: Colors.light.background,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  stepDescription: {
    fontSize: FontSizes.md,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  dateContainer: {
    backgroundColor: Colors.light.backgroundCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  dateLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  dateNote: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  timeSlotsContainer: {
    gap: Spacing.sm,
  },
  timeSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    ...Shadows.sm,
  },
  timeSlotButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  timeSlotIcon: {
    fontSize: FontSizes.lg,
    marginRight: Spacing.md,
  },
  timeSlotText: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  timeSlotTextActive: {
    color: Colors.light.background,
  },
  areasContainer: {
    gap: Spacing.sm,
  },
  areaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    ...Shadows.sm,
  },
  areaButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  areaInfo: {
    flex: 1,
  },
  areaName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  areaNameActive: {
    color: Colors.light.background,
  },
  areaFee: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
  },
  areaFeeActive: {
    color: Colors.light.accent,
  },
  addressContainer: {
    gap: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.light.text,
    textAlignVertical: 'top',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.light.text,
    textAlignVertical: 'top',
  },
  confirmationContainer: {
    backgroundColor: Colors.light.backgroundCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
    gap: Spacing.md,
  },
  confirmationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  confirmationText: {
    flex: 1,
  },
  confirmationLabel: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  confirmationValue: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: Spacing.sm,
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    gap: Spacing.xs,
  },
  previousButtonText: {
    color: Colors.light.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  nextButtonText: {
    color: Colors.light.background,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.success,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  confirmButtonText: {
    color: Colors.light.background,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.light.textSecondary,
  },
  addressesList: {
    maxHeight: 400,
    marginBottom: Spacing.md,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.light.border,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  addressCardActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  addressCardContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  defaultBadge: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  defaultBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.light.background,
    fontWeight: '600',
  },
  addressText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  addressTextActive: {
    color: Colors.light.background,
  },
  addressZone: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  addressZoneActive: {
    color: Colors.light.accent,
  },
  addressNotes: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  addressNotesActive: {
    color: Colors.light.accent,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundCard,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
    marginTop: Spacing.sm,
  },
  addAddressButtonText: {
    fontSize: FontSizes.md,
    color: Colors.light.primary,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  newAddressForm: {
    backgroundColor: Colors.light.backgroundCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  zonesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  zoneChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  zoneChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  zoneChipText: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    fontWeight: '500',
  },
  zoneChipTextActive: {
    color: Colors.light.background,
  },
  newAddressActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    fontWeight: '600',
  },
  saveAddressButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  saveAddressButtonText: {
    fontSize: FontSizes.md,
    color: Colors.light.background,
    fontWeight: '600',
  },
});
