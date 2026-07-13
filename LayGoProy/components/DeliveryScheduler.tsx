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
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from './MapViewWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../contexts/AuthContext';
import { deliveryAddressesService } from '../services/deliveryAddressesService';
import { DeliveryAddress } from '../data/userStorage';
import { useAppColors } from '../contexts/ThemeContext';

// Función para parsear fecha YYYY-MM-DD sin problemas de zona horaria
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month es 0-indexed
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Ajustado para que comience en Lunes (0) a Domingo (6)
};

// Función para formatear fecha a string legible
const formatDateForDisplay = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

interface DeliverySchedule {
  id: string;
  date: string;
  timeSlot: string;
  address: string;
  addressId?: string; // ID de la dirección en delivery_addresses
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

const getSimulatedCoordinatesFromGPS = (lat: number, lon: number) => {
  const minLat = -11.95;
  const maxLat = -12.20;
  const minLon = -77.15;
  const maxLon = -76.90;
  
  let x = 125;
  let y = 100;
  
  if (lat >= maxLat && lat <= minLat) {
    y = 20 + ((lat - minLat) / (maxLat - minLat)) * 160;
  } else if (lat < maxLat) {
    y = 180;
  } else {
    y = 20;
  }
  
  if (lon >= minLon && lon <= maxLon) {
    x = 20 + ((lon - minLon) / (maxLon - minLon)) * 210;
  } else if (lon < minLon) {
    x = 20;
  } else {
    x = 230;
  }
  
  return { x: Math.round(x), y: Math.round(y) };
};

export default function DeliveryScheduler({
  visible,
  onClose,
  onSchedule,
  existingSchedule,
}: DeliverySchedulerProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { horizontalPadding, scaleFont } = useResponsive();
  const colors = useAppColors();
  const styles = getStyles(colors);
  
  const [selectedDate, setSelectedDate] = useState(
    existingSchedule?.date || new Date().toISOString().split('T')[0]
  );

  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => {
    const initDate = selectedDate ? parseLocalDate(selectedDate) : new Date();
    return isNaN(initDate.getTime()) ? new Date() : initDate;
  });

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
  const [saveThisAddress, setSaveThisAddress] = useState(true);

  // Search and Map simulated states (same as delivery-addresses.tsx)
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LimaLocation[]>([]);
  const [markerPos, setMarkerPos] = useState({ x: 125, y: 100 });
  const mapWidth = 250;
  const mapHeight = 200;
  const [markerCoords, setMarkerCoords] = useState({ latitude: -12.046374, longitude: -77.042793 });
  const [isLocating, setIsLocating] = useState(false);
  const [showZoneAccordion, setShowZoneAccordion] = useState(false);

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
    setNewAddressForm(prev => ({
      ...prev,
      address: fullAddress,
      zone: loc.zone,
    }));
    setMarkerPos({ x: loc.x, y: loc.y });
    
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

        let resolvedZone: 'lima-centro' | 'lima-norte' | 'lima-sur' | 'lima-este' | 'callao' = 'lima-centro';
        const distLower = district.toLowerCase();
        if (distLower.includes('olivos') || distLower.includes('comas') || distLower.includes('carabayllo') || distLower.includes('puente piedra') || distLower.includes('independencia') || distLower.includes('martin de porres')) {
          resolvedZone = 'lima-norte';
        } else if (distLower.includes('chorrillos') || distLower.includes('miraflores') || distLower.includes('surco') || distLower.includes('barranco') || distLower.includes('san juan de miraflores') || distLower.includes('villa el salvador') || distLower.includes('villa maria')) {
          resolvedZone = distLower.includes('miraflores') || distLower.includes('surco') || distLower.includes('barranco') ? 'lima-centro' : 'lima-sur';
        } else if (distLower.includes('ate') || distLower.includes('la molina') || distLower.includes('san juan de lurigancho') || distLower.includes('santa anita') || distLower.includes('el agustino') || distLower.includes('cienegilla') || distLower.includes('chaclacayo')) {
          resolvedZone = 'lima-este';
        } else if (distLower.includes('callao') || distLower.includes('bellavista') || distLower.includes('carmen de la legua') || distLower.includes('perla') || distLower.includes('punta')) {
          resolvedZone = 'callao';
        }

        setNewAddressForm(prev => ({
          ...prev,
          address: fullAddress,
          zone: resolvedZone,
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

        let resolvedZone: 'lima-centro' | 'lima-norte' | 'lima-sur' | 'lima-este' | 'callao' = 'lima-centro';
        const distLower = district.toLowerCase();
        if (distLower.includes('olivos') || distLower.includes('comas') || distLower.includes('carabayllo') || distLower.includes('puente piedra') || distLower.includes('independencia') || distLower.includes('martin de porres')) {
          resolvedZone = 'lima-norte';
        } else if (distLower.includes('chorrillos') || distLower.includes('miraflores') || distLower.includes('surco') || distLower.includes('barranco') || distLower.includes('san juan de miraflores') || distLower.includes('villa el salvador') || distLower.includes('villa maria')) {
          resolvedZone = distLower.includes('miraflores') || distLower.includes('surco') || distLower.includes('barranco') ? 'lima-centro' : 'lima-sur';
        } else if (distLower.includes('ate') || distLower.includes('la molina') || distLower.includes('san juan de lurigancho') || distLower.includes('santa anita') || distLower.includes('el agustino') || distLower.includes('cienegilla') || distLower.includes('chaclacayo')) {
          resolvedZone = 'lima-este';
        } else if (distLower.includes('callao') || distLower.includes('bellavista') || distLower.includes('carmen de la legua') || distLower.includes('perla') || distLower.includes('punta')) {
          resolvedZone = 'callao';
        }

        setNewAddressForm(prev => ({
          ...prev,
          address: fullAddress,
          zone: resolvedZone,
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
    
    setNewAddressForm(prev => ({
      ...prev,
      address: resolvedAddress,
      zone: resolvedZone,
    }));
    setSearchQuery(resolvedAddress);
  };

  const handleRealSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLocating(true);
    try {
      let searchString = searchQuery.trim();
      if (!searchString.toLowerCase().includes('lima') && !searchString.toLowerCase().includes('callao')) {
        searchString += ', Lima, Perú';
      }
      
      const results = await Location.geocodeAsync(searchString);
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        setMarkerCoords({ latitude, longitude });
        
        const simCoords = getSimulatedCoordinatesFromGPS(latitude, longitude);
        setMarkerPos(simCoords);
        
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
            fullAddress = searchQuery.trim();
          }

          let resolvedZone = resolveZoneFromCoordinates(simCoords.x, simCoords.y, mapWidth, mapHeight);

          setNewAddressForm(prev => ({
            ...prev,
            address: fullAddress,
            zone: resolvedZone,
          }));
        }
      } else {
        Alert.alert('Sin resultados', 'No se encontró la dirección especificada.');
      }
    } catch (error) {
      console.error('Error en geocodificación:', error);
      Alert.alert('Error', 'No se pudo buscar la dirección.');
    } finally {
      setIsLocating(false);
      setSuggestions([]);
    }
  };

  // El número máximo de pasos ahora siempre es 4
  const maxSteps = 4;

  const handleNext = () => {
    if (step === 1 && !selectedDate) {
      Alert.alert('Error', 'Por favor selecciona una fecha');
      return;
    }
    if (step === 2 && !selectedTimeSlot) {
      Alert.alert('Error', 'Por favor selecciona un horario');
      return;
    }
    
    // Validar paso 3 según si hay direcciones guardadas
    if (savedAddresses.length > 0) {
      if (step === 3 && !selectedAddressId && !showAddAddress) {
        Alert.alert('Error', 'Por favor selecciona una dirección o añade una nueva');
        return;
      }
      if (step === 3 && showAddAddress) {
        Alert.alert('Dirección no guardada', 'Guarda la dirección primero o cancela.');
        return;
      }
    } else {
      // Sin direcciones guardadas, el paso 3 es el formulario de Nueva Dirección
      if (step === 3) {
        if (!newAddressForm.address.trim()) {
          Alert.alert('Error', 'Por favor ingresa la dirección completa');
          return;
        }
        if (!newAddressForm.zone) {
          Alert.alert('Error', 'Por favor selecciona la zona');
          return;
        }
        // Copiar del formulario a los estados principales
        setAddress(newAddressForm.address.trim());
        setSelectedArea(newAddressForm.zone);
        setNotes(newAddressForm.notes.trim());
      }
    }
    
    if (step < maxSteps) {
      setStep(step + 1);
    }
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

  const handleConfirm = async () => {
    const selectedTimeData = timeSlots.find(slot => slot.id === selectedTimeSlot);
    
    if (!selectedTimeData) {
      Alert.alert('Error', 'Información incompleta');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Error', 'Por favor selecciona o ingresa una dirección');
      return;
    }

    const proceedWithSchedule = (addressId?: string) => {
      const schedule: DeliverySchedule = {
        id: existingSchedule?.id || Date.now().toString(),
        date: selectedDate,
        timeSlot: selectedTimeData.label,
        address: address.trim(),
        addressId: addressId,
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
      setSearchQuery('');
      setSuggestions([]);
    };

    // Si el usuario no tiene direcciones guardadas previamente, preguntar al confirmar
    if (savedAddresses.length === 0 && user?.id) {
      Alert.alert(
        'Guardar dirección',
        '¿Deseas guardar esta dirección en tu perfil para futuras compras?',
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: () => {
              proceedWithSchedule(undefined);
            }
          },
          {
            text: 'Sí',
            onPress: async () => {
              try {
                const savedId = await deliveryAddressesService.saveAddress(user.id, {
                  address: address.trim(),
                  zone: selectedArea || undefined,
                  notes: notes.trim() || undefined,
                  isDefault: true,
                });
                proceedWithSchedule(savedId || undefined);
              } catch (error) {
                console.error('Error al guardar dirección al confirmar:', error);
                proceedWithSchedule(undefined);
              }
            }
          }
        ]
      );
    } else {
      proceedWithSchedule(selectedAddressId || undefined);
    }
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ] as const;

  const calendarYear = currentCalendarDate.getFullYear();
  const calendarMonth = currentCalendarDate.getMonth();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayIndex = getFirstDayOfMonth(calendarYear, calendarMonth);

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));
  };

  const renderStep1 = () => {
    const minDateStr = getMinDate();
    const maxDateStr = getMaxDate();
    
    // Generar días
    const daysGrid = [];
    // Espacios vacíos para el inicio de mes
    for (let i = 0; i < firstDayIndex; i++) {
      daysGrid.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
    }
    
    // Días reales del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(calendarMonth + 1).padStart(2, '0');
      const dateStr = `${calendarYear}-${monthStr}-${dayStr}`;
      
      const isSelected = dateStr === selectedDate;
      const isBeforeMin = dateStr < minDateStr;
      const isAfterMax = dateStr > maxDateStr;
      const isDisabled = isBeforeMin || isAfterMax;
      
      daysGrid.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[
            styles.calendarDay,
            isSelected && styles.calendarDaySelected,
            isDisabled && styles.calendarDayDisabled
          ]}
          disabled={isDisabled}
          onPress={() => setSelectedDate(dateStr)}
        >
          <Text style={[
            styles.calendarDayText,
            isSelected && styles.calendarDayTextSelected,
            isDisabled && styles.calendarDayTextDisabled
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Selecciona la Fecha</Text>
        <Text style={styles.stepDescription}>
          Elige cuándo quieres recibir tu pedido en tu comercio
        </Text>
        
        <View style={styles.calendarContainer}>
          {/* Cabecera del calendario */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={prevMonth} style={styles.calendarNavBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.calendarMonthTitle}>
              {monthNames[calendarMonth]} {calendarYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.calendarNavBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Días de la semana */}
          <View style={styles.weekdaysRow}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <Text key={d} style={styles.weekdayText}>{d}</Text>
            ))}
          </View>

          {/* Grilla de días */}
          <View style={styles.daysGrid}>
            {daysGrid}
          </View>
        </View>

        <View style={styles.selectedDateBadge}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.selectedDateText}>
            Fecha seleccionada: {selectedDate ? formatDateForDisplay(selectedDate) : 'Ninguna'}
          </Text>
        </View>
        
        <Text style={styles.dateNote}>
          * Programación con mínimo 24 horas de anticipación (rango de 30 días)
        </Text>
      </View>
    );
  };

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
                          color={selectedAddressId === addr.id ? colors.background : colors.primary} 
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
                      <Ionicons name="checkmark-circle" size={24} color={colors.background} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {!showAddAddress ? (
                <TouchableOpacity
                  style={styles.addAddressButton}
                  onPress={() => setShowAddAddress(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
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
                    placeholderTextColor={colors.textLight}
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
                  
                  <Text style={styles.inputLabel}>Notas / Referencia:</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={newAddressForm.notes}
                    onChangeText={(text) => setNewAddressForm({ ...newAddressForm, notes: text })}
                    placeholder="Ej: Portón azul, timbre malogrado"
                    placeholderTextColor={colors.textLight}
                    multiline
                    numberOfLines={2}
                  />
                  
                  <View style={styles.newAddressActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setNewAddressForm({ address: '', zone: '', notes: '' });
                        setShowAddAddress(false);
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

    // Flujo alternativo sin direcciones guardadas (Paso 3 es formulario completo)
    return renderStep3Alternative();
  };

  const renderStep3Alternative = () => (
    <View style={styles.stepContainer}>
      {/* Search box */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Buscar dirección</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.input, { flex: 1, paddingRight: 70 }]}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleRealSearch}
            placeholder="Escribe tu dirección (ej: Larco, Miraflores)"
            placeholderTextColor={colors.textLight}
            returnKeyType="search"
          />
          <View style={styles.searchActions}>
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.searchActionBtn}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleRealSearch} style={styles.searchActionBtn}>
              <Ionicons name="search" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
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
          {Marker && (
            <Marker
              coordinate={markerCoords}
              draggable
              onDragEnd={(e: any) => handleMapPress({ nativeEvent: { coordinate: e.nativeEvent.coordinate } })}
              title="Tu ubicación de entrega"
              description={newAddressForm.address}
            />
          )}
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
            {newAddressForm.zone ? getZoneDisplayName(newAddressForm.zone) : 'Seleccionar zona de entrega'}
          </Text>
          <Ionicons 
            name={showZoneAccordion ? "chevron-up" : "chevron-down"} 
            size={18} 
            color={colors.text} 
          />
        </TouchableOpacity>
        
        {showZoneAccordion && (
          <View style={styles.accordionContent}>
            {deliveryAreas.filter(a => a.id !== 'provincias').map((area) => (
              <TouchableOpacity
                key={area.id}
                style={[
                  styles.accordionOption,
                  newAddressForm.zone === area.id && styles.accordionOptionActive
                ]}
                onPress={() => {
                  setNewAddressForm(prev => ({ ...prev, zone: area.id }));
                  setShowZoneAccordion(false);
                }}
              >
                <View style={styles.accordionOptionRow}>
                  <Text style={[
                    styles.accordionOptionText,
                    newAddressForm.zone === area.id && styles.accordionOptionTextActive
                  ]}>
                    {area.name}
                  </Text>
                  <Text style={styles.accordionOptionFee}>
                    {area.fee === 0 ? 'Envío Gratis' : `Costo de envío: S/ ${area.fee.toFixed(2)}`}
                  </Text>
                </View>
                {newAddressForm.zone === area.id && (
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
          value={newAddressForm.address}
          onChangeText={(text) => setNewAddressForm({ ...newAddressForm, address: text })}
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
          value={newAddressForm.notes}
          onChangeText={(text) => setNewAddressForm({ ...newAddressForm, notes: text })}
          placeholder="Instrucciones para el repartidor (ej: timbre malogrado, reja negra)..."
          placeholderTextColor={colors.textLight}
          multiline
          numberOfLines={2}
        />
      </View>
    </View>
  );

  const renderStep4 = () => {
    const selectedTimeData = timeSlots.find(slot => slot.id === selectedTimeSlot);
    
    // Si hay una dirección seleccionada de la lista
    const selectedAddressData = savedAddresses.find(addr => addr.id === selectedAddressId);
    
    // Zona actual (de la dirección seleccionada, o seleccionada en el formulario)
    const currentZone = selectedAddressData?.zone || selectedArea;
    const selectedAreaData = currentZone 
      ? deliveryAreas.find(area => area.id === currentZone)
      : null;
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Confirmar Entrega</Text>
        <Text style={styles.stepDescription}>
          Revisa los detalles de tu entrega programada
        </Text>
        
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationItem}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <View style={styles.confirmationText}>
              <Text style={styles.confirmationLabel}>Fecha:</Text>
              <Text style={styles.confirmationValue}>
                {formatDateForDisplay(selectedDate)}
              </Text>
            </View>
          </View>
          
          <View style={styles.confirmationItem}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <View style={styles.confirmationText}>
              <Text style={styles.confirmationLabel}>Horario:</Text>
              <Text style={styles.confirmationValue}>
                {selectedTimeData?.label}
              </Text>
            </View>
          </View>
          
          {selectedAreaData && (
            <View style={styles.confirmationItem}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <View style={styles.confirmationText}>
                <Text style={styles.confirmationLabel}>Zona:</Text>
                <Text style={styles.confirmationValue}>
                  {selectedAreaData.name} {selectedAreaData.fee === 0 ? '(Gratis)' : `(+S/ ${selectedAreaData.fee})`}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.confirmationItem}>
            <Ionicons name="home" size={20} color={colors.primary} />
            <View style={styles.confirmationText}>
              <Text style={styles.confirmationLabel}>Dirección:</Text>
              <Text style={styles.confirmationValue}>{address}</Text>
            </View>
          </View>
          
          {notes && (
            <View style={styles.confirmationItem}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
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
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + Spacing.sm, paddingHorizontal: horizontalPadding },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { fontSize: scaleFont(17) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Programar entrega
          </Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepIndicatorText}>{step}/{maxSteps}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: Spacing.lg }}
        >
          {renderCurrentStep()}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, paddingHorizontal: horizontalPadding }]}>
          {step > 1 && (
            <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
              <Text style={styles.previousButtonText} numberOfLines={1}>Anterior</Text>
            </TouchableOpacity>
          )}
          
          {step < maxSteps ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText} numberOfLines={1} adjustsFontSizeToFit>Siguiente</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.background} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Ionicons name="checkmark" size={20} color={colors.background} />
              <Text style={styles.confirmButtonText} numberOfLines={1} adjustsFontSizeToFit>Confirmar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      backgroundColor: colors.backgroundCard,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      padding: Spacing.sm,
    },
    headerTitle: {
      flex: 1,
      fontSize: FontSizes.lg,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginHorizontal: Spacing.xs,
    },
    stepIndicator: {
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
    },
    stepIndicatorText: {
      color: colors.background,
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
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    stepDescription: {
      fontSize: FontSizes.md,
      color: colors.textSecondary,
      marginBottom: Spacing.lg,
      lineHeight: 22,
    },
    dateContainer: {
      backgroundColor: colors.backgroundCard,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      ...Shadows.sm,
    },
    dateLabel: {
      fontSize: FontSizes.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    dateInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      fontSize: FontSizes.md,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    dateNote: {
      fontSize: FontSizes.sm,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: Spacing.sm,
    },
    timeSlotsContainer: {
      gap: Spacing.sm,
    },
    timeSlotButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundCard,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },
    timeSlotButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    timeSlotIcon: {
      fontSize: FontSizes.lg,
      marginRight: Spacing.md,
    },
    timeSlotText: {
      fontSize: FontSizes.md,
      color: colors.text,
      fontWeight: '500',
    },
    timeSlotTextActive: {
      color: colors.background,
    },
    areasContainer: {
      gap: Spacing.sm,
    },
    areaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.backgroundCard,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },
    areaButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    areaInfo: {
      flex: 1,
    },
    areaName: {
      fontSize: FontSizes.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    areaNameActive: {
      color: colors.background,
    },
    areaFee: {
      fontSize: FontSizes.sm,
      color: colors.textSecondary,
    },
    areaFeeActive: {
      color: colors.accent,
    },
    addressContainer: {
      gap: Spacing.md,
    },
    inputLabel: {
      fontSize: FontSizes.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    addressInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      fontSize: FontSizes.md,
      color: colors.text,
      backgroundColor: colors.background,
      textAlignVertical: 'top',
      marginBottom: Spacing.md,
    },
    notesInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      fontSize: FontSizes.md,
      color: colors.text,
      backgroundColor: colors.background,
      textAlignVertical: 'top',
    },
    confirmationContainer: {
      backgroundColor: colors.backgroundCard,
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
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    confirmationValue: {
      fontSize: FontSizes.md,
      color: colors.text,
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row',
      padding: Spacing.lg,
      backgroundColor: colors.backgroundCard,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: Spacing.sm,
    },
    previousButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      gap: Spacing.xs,
    },
    previousButtonText: {
      color: colors.primary,
      fontSize: FontSizes.md,
      fontWeight: '600',
    },
    nextButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      gap: Spacing.xs,
    },
    nextButtonText: {
      color: colors.background,
      fontSize: FontSizes.md,
      fontWeight: '600',
      flexShrink: 1,
    },
    confirmButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.success,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      gap: Spacing.xs,
    },
    confirmButtonText: {
      color: colors.background,
      fontSize: FontSizes.md,
      fontWeight: '600',
      flexShrink: 1,
    },
    loadingContainer: {
      padding: Spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: FontSizes.md,
      color: colors.textSecondary,
    },
    addressesList: {
      maxHeight: 400,
      marginBottom: Spacing.md,
    },
    addressCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.backgroundCard,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      borderColor: colors.border,
      marginBottom: Spacing.md,
      ...Shadows.sm,
    },
    addressCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
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
      backgroundColor: colors.success,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
      marginLeft: Spacing.sm,
    },
    defaultBadgeText: {
      fontSize: FontSizes.xs,
      color: colors.background,
      fontWeight: '600',
    },
    addressText: {
      fontSize: FontSizes.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    addressTextActive: {
      color: colors.background,
    },
    addressZone: {
      fontSize: FontSizes.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    addressZoneActive: {
      color: colors.accent,
    },
    addressNotes: {
      fontSize: FontSizes.sm,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    addressNotesActive: {
      color: colors.accent,
    },
    addAddressButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundCard,
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      marginTop: Spacing.sm,
    },
    addAddressButtonText: {
      fontSize: FontSizes.md,
      color: colors.primary,
      fontWeight: '600',
      marginLeft: Spacing.sm,
    },
    newAddressForm: {
      backgroundColor: colors.backgroundCard,
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
      marginTop: Spacing.xs,
    },
    zoneChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    zoneChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    zoneChipText: {
      fontSize: FontSizes.sm,
      color: colors.text,
      fontWeight: '500',
    },
    zoneChipTextActive: {
      color: colors.background,
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
      borderColor: colors.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: FontSizes.md,
      color: colors.text,
      fontWeight: '600',
    },
    saveAddressButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    saveAddressButtonText: {
      fontSize: FontSizes.md,
      color: colors.background,
      fontWeight: '600',
    },
    // Calendar Styles
    calendarContainer: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
      marginBottom: Spacing.md,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    calendarNavBtn: {
      padding: Spacing.xs,
    },
    calendarMonthTitle: {
      fontSize: FontSizes.md,
      fontWeight: 'bold',
      color: colors.text,
    },
    weekdaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: Spacing.xs,
    },
    weekdayText: {
      width: 32,
      textAlign: 'center',
      fontSize: FontSizes.xs,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    calendarDay: {
      width: 38,
      height: 38,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: BorderRadius.full,
      marginVertical: 2,
    },
    calendarDayEmpty: {
      width: 38,
      height: 38,
      marginVertical: 2,
    },
    calendarDaySelected: {
      backgroundColor: colors.primary,
    },
    calendarDayDisabled: {
      opacity: 0.25,
    },
    calendarDayText: {
      fontSize: FontSizes.sm,
      color: colors.text,
      fontWeight: '500',
    },
    calendarDayTextSelected: {
      color: colors.background,
      fontWeight: 'bold',
    },
    calendarDayTextDisabled: {
      color: colors.textLight,
    },
    saveToggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    saveToggleLabel: {
      fontSize: FontSizes.sm,
      fontWeight: '500',
      color: colors.text,
      flex: 1,
      marginRight: Spacing.md,
    },
    selectedDateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '15',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.md,
    },
    selectedDateText: {
      fontSize: FontSizes.sm,
      fontWeight: '600',
      color: colors.primary,
      marginLeft: Spacing.xs,
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
    searchActions: {
      position: 'absolute',
      right: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    searchActionBtn: {
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
    inputGroup: {
      marginBottom: Spacing.lg,
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
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
  });
}
