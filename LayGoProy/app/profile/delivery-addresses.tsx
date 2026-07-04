import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Dimensions as RNDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';

let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.error('Error loading react-native-maps:', e);
  }
}
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { FormSheetModal } from '../../components/ui/FormSheetModal';
import { AppButton } from '../../components/ui/AppButton';
import { ActionRow, ActionRowGroup } from '../../components/ui/ActionRow';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import { DeliveryAddress } from '../../data/userStorage';
import { useAppColors } from '../../contexts/ThemeContext';

const deliveryAreas = [
  { id: 'lima-centro', name: 'Lima Centro', fee: 0 },
  { id: 'lima-norte', name: 'Lima Norte', fee: 5 },
  { id: 'lima-sur', name: 'Lima Sur', fee: 5 },
  { id: 'lima-este', name: 'Lima Este', fee: 8 },
  { id: 'callao', name: 'Callao', fee: 3 },
];

interface LimaLocation {
  address: string;
  district: string;
  zone: 'lima-centro' | 'lima-norte' | 'lima-sur' | 'lima-este' | 'callao';
  x: number;
  y: number;
}

const LIMA_LOCATIONS: LimaLocation[] = [
  { address: 'Av. Arequipa 1230', district: 'Miraflores', zone: 'lima-centro', x: 100, y: 100 },
  { address: 'Av. Larco 456', district: 'Miraflores', zone: 'lima-centro', x: 100, y: 110 },
  { address: 'Calle Las Begonias 350', district: 'San Isidro', zone: 'lima-centro', x: 110, y: 90 },
  { address: 'Jr. Carabaya 500', district: 'Cercado de Lima', zone: 'lima-centro', x: 95, y: 75 },
  { address: 'Av. Brasil 2200', district: 'Jesús María', zone: 'lima-centro', x: 80, y: 90 },
  { address: 'Av. Las Palmeras 3800', district: 'Los Olivos', zone: 'lima-norte', x: 100, y: 35 },
  { address: 'Av. Antúnez de Mayolo 1200', district: 'Los Olivos', zone: 'lima-norte', x: 90, y: 40 },
  { address: 'Av. Alfredo Mendiola 1400', district: 'San Martín de Porres', zone: 'lima-norte', x: 85, y: 55 },
  { address: 'Av. Túpac Amaru 2500', district: 'Comas', zone: 'lima-norte', x: 110, y: 25 },
  { address: 'Av. Defensores del Morro 650', district: 'Chorrillos', zone: 'lima-sur', x: 100, y: 165 },
  { address: 'Av. Pedro Miotta 820', district: 'San Juan de Miraflores', zone: 'lima-sur', x: 115, y: 155 },
  { address: 'Av. Separadora Industrial 2400', district: 'Ate', zone: 'lima-este', x: 170, y: 85 },
  { address: 'Av. Javier Prado Este 4800', district: 'La Molina', zone: 'lima-este', x: 160, y: 95 },
  { address: 'Av. Gran Chimú 450', district: 'San Juan de Lurigancho', zone: 'lima-este', x: 130, y: 60 },
  { address: 'Av. Sáenz Peña 250', district: 'Callao', zone: 'callao', x: 30, y: 80 },
  { address: 'Av. La Marina 3200', district: 'La Perla', zone: 'callao', x: 45, y: 95 },
  { address: 'Calle Grau 120', district: 'La Punta', zone: 'callao', x: 15, y: 85 },
];

const resolveZoneFromCoordinates = (x: number, y: number, width: number, height: number) => {
  const relX = x / width;
  const relY = y / height;
  
  if (relX < 0.35 && relY < 0.6) return 'callao';
  if (relX >= 0.35 && relY < 0.45) return 'lima-norte';
  if (relX >= 0.6 && relY < 0.65) return 'lima-este';
  if (relY >= 0.65) return 'lima-sur';
  return 'lima-centro';
};


const getZoneDisplayName = (zoneId: string) => {
  return deliveryAreas.find(area => area.id === zoneId)?.name || zoneId;
};


export default function DeliveryAddressesScreen() {
  const { user, updateProfile } = useAuth();
  const colors = useAppColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { horizontalPadding, scaleFont, contentMaxWidth } = useResponsive();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(user?.deliveryAddresses || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);

  // Search and Map simulated states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LimaLocation[]>([]);
  const [markerPos, setMarkerPos] = useState({ x: 125, y: 100 });
  const mapWidth = 250;
  const mapHeight = 200;

  const [markerCoords, setMarkerCoords] = useState({ latitude: -12.046374, longitude: -77.042793 });
  const [isLocating, setIsLocating] = useState(false);
  const [showZoneAccordion, setShowZoneAccordion] = useState(false);

  const [formData, setFormData] = useState({
    address: '',
    zone: '',
    notes: '',
  });

  useEffect(() => {
    const loadAddresses = async () => {
      if (!user) return;

      // Verificar si el usuario tiene UUID válido (está en Supabase)
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      
      if (isValidUUID) {
        // Cargar desde la tabla delivery_addresses
        try {
          const { deliveryAddressesService } = await import('../../services/deliveryAddressesService');
          const addressesFromTable = await deliveryAddressesService.getAddresses(user.id);
          
          if (addressesFromTable.length > 0) {
            setAddresses(addressesFromTable);
            // NO actualizar JSONB - las direcciones están en la tabla
          } else if (user.deliveryAddresses && user.deliveryAddresses.length > 0) {
            // Si hay direcciones en JSONB pero no en la tabla, migrar a la tabla
            await deliveryAddressesService.syncFromJSONB(user.id, user.deliveryAddresses);
            const syncedAddresses = await deliveryAddressesService.getAddresses(user.id);
            setAddresses(syncedAddresses);
            // NO actualizar JSONB - las direcciones ya están en la tabla
          } else {
            setAddresses([]);
          }
        } catch (error) {
          console.error('Error loading addresses from table:', error);
          // Fallback a direcciones del perfil local
          if (user.deliveryAddresses) {
            setAddresses(user.deliveryAddresses);
          }
        }
      } else {
        // Usar direcciones del perfil local (JSONB)
        if (user.deliveryAddresses) {
          setAddresses(user.deliveryAddresses);
        }
      }
    };

    loadAddresses();
  }, [user]);

  const handleSave = async () => {
    if (!formData.address.trim()) {
      Alert.alert('Error', 'La dirección es requerida');
      return;
    }

    if (!formData.zone) {
      Alert.alert('Error', 'Selecciona la zona de entrega');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    // Verificar si el usuario tiene UUID válido (está en Supabase)
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    
    if (isValidUUID) {
      // Usar la tabla delivery_addresses
      try {
        const { deliveryAddressesService } = await import('../../services/deliveryAddressesService');
        
        if (editingAddress) {
          // Actualizar dirección existente
          console.log('Actualizando dirección:', { userId: user.id, addressId: editingAddress.id });
          const success = await deliveryAddressesService.updateAddress(
            user.id,
            editingAddress.id,
            {
              address: formData.address.trim(),
              zone: formData.zone,
              notes: formData.notes.trim() || undefined,
              isDefault: addresses.length === 0 || editingAddress.isDefault || false,
            }
          );

          if (success) {
            console.log('Dirección actualizada exitosamente');
            // Recargar direcciones desde Supabase
            const updatedAddresses = await deliveryAddressesService.getAddresses(user.id);
            setAddresses(updatedAddresses);
            // NO actualizar JSONB - las direcciones están en la tabla
            setShowAddModal(false);
            setEditingAddress(null);
            resetForm();
            Alert.alert('Éxito', 'Dirección actualizada correctamente');
          } else {
            console.error('Error: updateAddress retornó false');
            Alert.alert('Error', 'No se pudo actualizar la dirección. Revisa la consola para más detalles.');
          }
        } else {
          // Crear nueva dirección
          console.log('Guardando nueva dirección:', { userId: user.id, zone: formData.zone });
          const addressId = await deliveryAddressesService.saveAddress(user.id, {
            address: formData.address.trim(),
            zone: formData.zone,
            notes: formData.notes.trim() || undefined,
            isDefault: addresses.length === 0 || false,
          });

          if (addressId) {
            console.log('Dirección guardada exitosamente:', addressId);
            // Recargar direcciones desde Supabase
            const updatedAddresses = await deliveryAddressesService.getAddresses(user.id);
            setAddresses(updatedAddresses);
            // NO actualizar JSONB - las direcciones están en la tabla
            setShowAddModal(false);
            resetForm();
            Alert.alert('Éxito', 'Dirección guardada correctamente');
          } else {
            console.error('Error: saveAddress retornó null');
            Alert.alert('Error', 'No se pudo guardar la dirección. Revisa la consola para más detalles.');
          }
        }
      } catch (error) {
        console.error('Error en handleSave (delivery addresses):', error);
        Alert.alert('Error', `Error al guardar dirección: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    } else {
      // Fallback a JSONB en user_profiles (modo local)
      const newAddress: DeliveryAddress = {
        id: editingAddress?.id || Date.now().toString(),
        address: formData.address.trim(),
        zone: formData.zone,
        notes: formData.notes.trim() || undefined,
        isDefault: addresses.length === 0 || editingAddress?.isDefault || false,
      };

      let updatedAddresses: DeliveryAddress[];
      if (editingAddress) {
        updatedAddresses = addresses.map(a => a.id === editingAddress.id ? newAddress : a);
      } else {
        updatedAddresses = [...addresses, newAddress];
      }

      const success = await updateProfile({ deliveryAddresses: updatedAddresses });
      if (success) {
        setAddresses(updatedAddresses);
        setShowAddModal(false);
        setEditingAddress(null);
        resetForm();
      } else {
        Alert.alert('Error', 'No se pudo guardar la dirección');
      }
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    Alert.alert(
      'Eliminar Dirección',
      '¿Estás seguro de que quieres eliminar esta dirección?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // Verificar si el usuario tiene UUID válido (está en Supabase)
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
            
            if (isValidUUID) {
              // Eliminar de la tabla delivery_addresses
              const { deliveryAddressesService } = await import('../../services/deliveryAddressesService');
              const success = await deliveryAddressesService.deleteAddress(user.id, addressId);
              
              if (success) {
                // Recargar direcciones desde Supabase
                const updatedAddresses = await deliveryAddressesService.getAddresses(user.id);
                setAddresses(updatedAddresses);
                // NO actualizar JSONB - las direcciones están en la tabla
              } else {
                Alert.alert('Error', 'No se pudo eliminar la dirección');
              }
            } else {
              // Fallback a JSONB (modo local)
              const updatedAddresses = addresses.filter(a => a.id !== addressId);
              const success = await updateProfile({ deliveryAddresses: updatedAddresses });
              if (success) {
                setAddresses(updatedAddresses);
              } else {
                Alert.alert('Error', 'No se pudo eliminar la dirección');
              }
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    // Verificar si el usuario tiene UUID válido (está en Supabase)
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    
    if (isValidUUID) {
      // Actualizar en la tabla delivery_addresses
      const { deliveryAddressesService } = await import('../../services/deliveryAddressesService');
      const success = await deliveryAddressesService.updateAddress(user.id, addressId, { isDefault: true });
      
      if (success) {
        // Recargar direcciones desde Supabase
        const updatedAddresses = await deliveryAddressesService.getAddresses(user.id);
        setAddresses(updatedAddresses);
        // NO actualizar JSONB - las direcciones están en la tabla
      }
    } else {
      // Fallback a JSONB (modo local)
      const updatedAddresses = addresses.map(a => ({
        ...a,
        isDefault: a.id === addressId,
      }));
      const success = await updateProfile({ deliveryAddresses: updatedAddresses });
      if (success) {
        setAddresses(updatedAddresses);
      }
    }
  };

  const handleEdit = (address: DeliveryAddress) => {
    setEditingAddress(address);
    setFormData({
      address: address.address,
      zone: address.zone || '',
      notes: address.notes || '',
    });
    
    // Buscar si coincide con alguna de nuestras ubicaciones precargadas para situar el pin
    const match = LIMA_LOCATIONS.find(loc => address.address.includes(loc.address));
    if (match) {
      setMarkerPos({ x: match.x, y: match.y });
      setSearchQuery(address.address);
      
      // Coordenadas GPS estimadas para el mapa
      let gpsCoords = { latitude: -12.115, longitude: -77.03 };
      if (match.zone === 'lima-norte') gpsCoords = { latitude: -11.97, longitude: -77.07 };
      else if (match.zone === 'lima-sur') gpsCoords = { latitude: -12.18, longitude: -77.01 };
      else if (match.zone === 'lima-este') gpsCoords = { latitude: -12.05, longitude: -76.92 };
      else if (match.zone === 'callao') gpsCoords = { latitude: -12.06, longitude: -77.14 };
      setMarkerCoords(gpsCoords);
    } else {
      // Coordenadas por defecto según la zona
      if (address.zone === 'lima-norte') {
        setMarkerPos({ x: 100, y: 35 });
        setMarkerCoords({ latitude: -11.97, longitude: -77.07 });
      } else if (address.zone === 'lima-sur') {
        setMarkerPos({ x: 100, y: 165 });
        setMarkerCoords({ latitude: -12.18, longitude: -77.01 });
      } else if (address.zone === 'lima-este') {
        setMarkerPos({ x: 160, y: 95 });
        setMarkerCoords({ latitude: -12.05, longitude: -76.92 });
      } else if (address.zone === 'callao') {
        setMarkerPos({ x: 30, y: 80 });
        setMarkerCoords({ latitude: -12.06, longitude: -77.14 });
      } else {
        setMarkerPos({ x: 100, y: 100 });
        setMarkerCoords({ latitude: -12.046374, longitude: -77.042793 });
      }
      setSearchQuery(address.address);
    }
    
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      address: '',
      zone: '',
      notes: '',
    });
    setSearchQuery('');
    setSuggestions([]);
    setMarkerPos({ x: 125, y: 100 });
    setShowZoneAccordion(false);
  };

  const getZoneName = (zoneId: string) => {
    return deliveryAreas.find(area => area.id === zoneId)?.name || zoneId;
  };

  const getZoneFee = (zoneId: string) => {
    return deliveryAreas.find(area => area.id === zoneId)?.fee || 0;
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingAddress(null);
    resetForm();
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 1) {
      const filtered = LIMA_LOCATIONS.filter(loc => 
        loc.address.toLowerCase().includes(text.toLowerCase()) ||
        loc.district.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (loc: LimaLocation) => {
    const fullAddress = `${loc.address}, ${loc.district}`;
    setFormData(prev => ({
      ...prev,
      address: fullAddress,
    }));
    setMarkerPos({ x: loc.x, y: loc.y });
    
    // Map grid coordinate to approximate real GPS coord for Lima
    let gpsCoords = { latitude: -12.115, longitude: -77.03 }; // Miraflores
    if (loc.zone === 'lima-norte') gpsCoords = { latitude: -11.97, longitude: -77.07 };
    else if (loc.zone === 'lima-sur') gpsCoords = { latitude: -12.18, longitude: -77.01 };
    else if (loc.zone === 'lima-este') gpsCoords = { latitude: -12.05, longitude: -76.92 };
    else if (loc.zone === 'callao') gpsCoords = { latitude: -12.06, longitude: -77.14 };
    setMarkerCoords(gpsCoords);

    setSearchQuery(fullAddress);
    setSuggestions([]);
  };

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso denegado',
          'Se requiere permiso de ubicación para autocompletar tu dirección.'
        );
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      console.log('Ubicación GPS obtenida:', latitude, longitude);

      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      console.log('Geocodificación inversa:', geocode);

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const street = place.street || '';
        const number = place.name || place.subregion || '';
        const district = place.district || place.city || '';
        
        let fullAddress = street;
        if (number && !fullAddress.includes(number)) {
          fullAddress += ` ${number}`;
        }
        if (district) {
          fullAddress += `, ${district}`;
        }
        
        if (!fullAddress.trim()) {
          fullAddress = `Ubicación GPS (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
        }

        setFormData(prev => ({
          ...prev,
          address: fullAddress,
        }));
        setSearchQuery(fullAddress);
        setMarkerCoords({ latitude, longitude });
      } else {
        Alert.alert('Error', 'No se pudo determinar la dirección para tu ubicación actual.');
      }
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
      Alert.alert('Error', 'Hubo un problema al obtener la ubicación actual.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleMapPress = async (evt: any) => {
    const { latitude, longitude } = evt.nativeEvent.coordinate;
    setMarkerCoords({ latitude, longitude });
    
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const street = place.street || '';
        const number = place.name || '';
        const district = place.district || place.city || '';
        
        let fullAddress = street;
        if (number && !fullAddress.includes(number)) {
          fullAddress += ` ${number}`;
        }
        if (district) {
          fullAddress += `, ${district}`;
        }
        
        if (!fullAddress.trim()) {
          fullAddress = `Ubicación GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        }

        setFormData(prev => ({
          ...prev,
          address: fullAddress,
        }));
        setSearchQuery(fullAddress);
      }
    } catch (error) {
      console.error('Error reverse geocoding map press:', error);
    }
  };

  const handleSimulatedMapPress = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    setMarkerPos({ x: locationX, y: locationY });
    const resolvedZone = resolveZoneFromCoordinates(locationX, locationY, mapWidth, mapHeight);
    
    let resolvedAddress = '';
    if (resolvedZone === 'lima-centro') resolvedAddress = 'Av. Arequipa 1230, Miraflores';
    else if (resolvedZone === 'lima-norte') resolvedAddress = 'Av. Las Palmeras 3800, Los Olivos';
    else if (resolvedZone === 'lima-sur') resolvedAddress = 'Av. Defensores del Morro 650, Chorrillos';
    else if (resolvedZone === 'lima-este') resolvedAddress = 'Av. Javier Prado Este 4800, La Molina';
    else if (resolvedZone === 'callao') resolvedAddress = 'Av. Sáenz Peña 250, Callao';
    
    setFormData(prev => ({
      ...prev,
      address: resolvedAddress,
    }));
    setSearchQuery(resolvedAddress);
  };


  return (
    <View style={styles.container}>
      <ScreenHeader title="Direcciones de entrega" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingBottom: insets.bottom + 100,
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          width: '100%',
        }}
      >
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No tienes direcciones guardadas</Text>
            <Text style={styles.emptySubtext}>Agrega una para facilitar tus compras</Text>
          </View>
        ) : (
          addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <View style={styles.addressInfo}>
                  <Ionicons name="location" size={24} color={colors.primary} />
                  <View style={styles.addressDetails}>
                    <Text style={styles.addressText}>{address.address}</Text>
                    {address.zone && (
                      <Text style={styles.zoneText}>
                        {getZoneName(address.zone)} {getZoneFee(address.zone) === 0 ? '(Gratis)' : `(+S/ ${getZoneFee(address.zone)})`}
                      </Text>
                    )}
                    {address.notes && (
                      <Text style={styles.notesText}>{address.notes}</Text>
                    )}
                  </View>
                </View>
                {address.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Predeterminada</Text>
                  </View>
                )}
              </View>
              <ActionRowGroup>
                {!address.isDefault && (
                  <ActionRow
                    icon="star-outline"
                    label="Predeterminada"
                    onPress={() => handleSetDefault(address.id)}
                    color={colors.primary}
                  />
                )}
                <ActionRow
                  icon="create-outline"
                  label="Editar"
                  onPress={() => handleEdit(address)}
                  color={colors.secondary}
                />
                <ActionRow
                  icon="trash-outline"
                  label="Eliminar"
                  onPress={() => handleDelete(address.id)}
                  color={colors.error}
                />
              </ActionRowGroup>
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, paddingHorizontal: horizontalPadding }]}>
        <AppButton
          label="Agregar dirección"
          onPress={() => {
            resetForm();
            setEditingAddress(null);
            setShowAddModal(true);
          }}
          icon={<Ionicons name="add" size={22} color={colors.background} />}
        />
      </View>

      <FormSheetModal
        visible={showAddModal}
        title={editingAddress ? 'Editar dirección' : 'Nueva dirección'}
        onClose={closeModal}
      >
        {/* Search box */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Buscar dirección</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Escribe tu dirección (ej: Larco, Miraflores)"
              placeholderTextColor={colors.textLight}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete suggestions list */}
          {suggestions.length > 0 && (
            <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="handled">
              {suggestions.map((loc, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionRow}
                  onPress={() => handleSelectSuggestion(loc)}
                >
                  <Ionicons name="location-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {loc.address}, {loc.district} ({getZoneDisplayName(loc.zone)})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Location permission retrieval */}
        <TouchableOpacity
          style={[styles.locationBtn, { borderColor: colors.primary }]}
          onPress={handleGetCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="navigate" size={18} color={colors.primary} />
          )}
          <Text style={styles.locationBtnText}>
            {isLocating ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
          </Text>
        </TouchableOpacity>

        {/* Interactive map */}
        <Text style={[styles.inputLabel, { fontSize: scaleFont(13), marginBottom: 2 }]}>Ubicación exacta en el mapa</Text>
        <Text style={styles.gpsPrompt}>Arrastra o toca el mapa para ajustar el pin en Lima/Callao</Text>
        
        {Platform.OS !== 'web' && MapView ? (
          <MapView
            style={styles.mapContainer}
            initialRegion={{
              latitude: markerCoords.latitude,
              longitude: markerCoords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            region={{
              latitude: markerCoords.latitude,
              longitude: markerCoords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={handleMapPress}
          >
            <Marker
              coordinate={markerCoords}
              draggable
              onDragEnd={(e: any) => handleMapPress({ nativeEvent: { coordinate: e.nativeEvent.coordinate } })}
              title="Tu ubicación de entrega"
              description={formData.address}
            />
          </MapView>
        ) : (
          <TouchableOpacity 
            activeOpacity={0.9} 
            style={styles.mapContainer} 
            onPress={handleSimulatedMapPress}
          >
            {/* Simulated Map Visuals */}
            <View style={styles.mapGridLineH1} />
            <View style={styles.mapGridLineH2} />
            <View style={styles.mapGridLineV1} />
            <View style={styles.mapGridLineV2} />
            
            <Text style={[styles.mapLabel, { left: 15, top: 40 }]}>CALLAO</Text>
            <Text style={[styles.mapLabel, { left: 90, top: 20 }]}>LIMA NORTE</Text>
            <Text style={[styles.mapLabel, { left: 100, top: 90 }]}>LIMA CENTRO</Text>
            <Text style={[styles.mapLabel, { left: 170, top: 60 }]}>LIMA ESTE</Text>
            <Text style={[styles.mapLabel, { left: 110, top: 150 }]}>LIMA SUR</Text>

            {/* Simulated Coastline */}
            <View style={styles.mapCoastline} />
            
            {/* Map Pin */}
            <View style={[styles.mapPin, { left: markerPos.x - 12, top: markerPos.y - 24 }]}>
              <Ionicons name="location" size={28} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Accordion Zone Selector */}
        <View style={[styles.inputGroup, { marginTop: Spacing.md }]}>
          <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Zona de entrega *</Text>
          <TouchableOpacity 
            style={styles.accordionHeader} 
            onPress={() => setShowZoneAccordion(!showZoneAccordion)}
          >
            <Text style={styles.accordionHeaderText}>
              {formData.zone ? getZoneName(formData.zone) : 'Seleccionar zona de entrega'}
            </Text>
            <Ionicons 
              name={showZoneAccordion ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={colors.text} 
            />
          </TouchableOpacity>
          
          {showZoneAccordion && (
            <View style={styles.accordionContent}>
              {deliveryAreas.map((area) => (
                <TouchableOpacity
                  key={area.id}
                  style={[
                    styles.accordionOption,
                    formData.zone === area.id && styles.accordionOptionActive
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, zone: area.id }));
                    setShowZoneAccordion(false);
                  }}
                >
                  <View style={styles.accordionOptionRow}>
                    <Text style={[
                      styles.accordionOptionText,
                      formData.zone === area.id && styles.accordionOptionTextActive
                    ]}>
                      {area.name}
                    </Text>
                    <Text style={styles.accordionOptionFee}>
                      {area.fee === 0 ? 'Envío Gratis' : `Costo de envío: S/ ${area.fee.toFixed(2)}`}
                    </Text>
                  </View>
                  {formData.zone === area.id && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Editable confirmation address */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Dirección completa (Detalla el número/dpto) *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Ej: Av. Arequipa 1230, Dpto 402, Miraflores"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Reference / notes */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Notas / Referencia (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Instrucciones para el repartidor (ej: timbre malogrado, reja negra)..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={2}
          />
        </View>

        <AppButton label="Guardar Dirección" onPress={handleSave} />
      </FormSheetModal>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Spacing.md,
    ...Shadows.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: colors.text,
    marginTop: Spacing.md,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
  addressCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  addressInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  addressDetails: {
    marginLeft: Spacing.md,
    flex: 1,
    minWidth: 0,
  },
  addressText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: Spacing.xs,
    flexShrink: 1,
  },
  zoneText: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  notesText: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  defaultBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: FontSizes.xs,
    color: colors.background,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: colors.background,
  },
  locationBtnText: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: colors.primary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  zoneButtons: {
    gap: Spacing.sm,
  },
  zoneButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  zoneButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  zoneButtonText: {
    color: colors.text,
    flexShrink: 1,
  },
  zoneButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: Spacing.md,
    padding: Spacing.xs,
  },
  suggestionsContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    maxHeight: 150,
  },
  suggestionRow: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: FontSizes.sm,
    color: colors.text,
  },
  mapContainer: {
    width: '100%',
    height: 250,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignSelf: 'center',
    marginVertical: Spacing.sm,
  },
  mapGridLineH1: {
    position: 'absolute',
    top: 66,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  mapGridLineH2: {
    position: 'absolute',
    top: 133,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  mapGridLineV1: {
    position: 'absolute',
    left: 83,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  mapGridLineV2: {
    position: 'absolute',
    left: 166,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  mapLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    opacity: 0.4,
  },
  mapCoastline: {
    position: 'absolute',
    left: -20,
    bottom: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: colors.secondary,
    opacity: 0.15,
  },
  mapPin: {
    position: 'absolute',
    zIndex: 10,
  },
  resolvedZoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.sm,
  },
  resolvedZoneText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: Spacing.xs,
  },
  gpsPrompt: {
    fontSize: FontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: colors.background,
  },
  accordionHeaderText: {
    fontSize: FontSizes.md,
    color: colors.text,
    fontWeight: '500',
  },
  accordionContent: {
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
  accordionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  accordionOptionActive: {
    backgroundColor: colors.primary + '08',
  },
  accordionOptionRow: {
    flex: 1,
  },
  accordionOptionText: {
    fontSize: FontSizes.md,
    color: colors.text,
    fontWeight: '500',
  },
  accordionOptionTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  accordionOptionFee: {
    fontSize: FontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

