import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Alert, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTenant } from '../context/TenantContext.js';
import { responsiveStyles } from '../styles/responsiveStyles.js';

const SuggestionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { config } = useTenant();
  const styles = useMemo(() => createStyles(config), [config]);

  const { 
    imageUri, 
    imageBase64,
    suggestions, 
    originalRecognitionResult
  } = route.params || {};

  if (!suggestions || suggestions.length === 0) {
    Alert.alert('Error', 'No hay sugerencias para mostrar.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    return null;
  }

  const handleSelectSuggestion = (selectedPiece) => {
    navigation.replace('ResultScreen', {
      imageUri: imageUri,
      imageBase64: imageBase64,
      recognitionResult: {
        pieceName: selectedPiece.pieceName,
        confidence: selectedPiece.confidence,
        userSelected: true,
      },
    });
  };

  const handleNoneOfThese = () => {
    if (navigation.canGoBack()) {
        navigation.goBack();
    } else {
        navigation.replace('MainTabs', { screen: 'Cámara' });
    }
  };

  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item)}>
      <Text style={styles.suggestionName}>{item.pieceName}</Text>
      <Text style={styles.suggestionConfidence}>Confianza: {(item.confidence * 100).toFixed(1)}%</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={Platform.OS === 'web' ? responsiveStyles.responsiveSafeArea : styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>La confianza es baja. ¿Es alguno de estos?</Text>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />}
        
        <FlatList
          data={suggestions}
          renderItem={renderSuggestionItem}
          keyExtractor={(item, index) => `${item.pieceName}-${index}`}
          style={styles.list}
          contentContainerStyle={Platform.OS === 'web' ? { paddingBottom: 100 } : {}}
        />

        {Platform.OS === 'web' ? (
          <View style={responsiveStyles.fixedBottomContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.noneButton, responsiveStyles.responsiveButtonLarge]} 
              onPress={handleNoneOfThese}
            >
              <Text style={styles.buttonText}>Ninguno / Volver a intentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.button, styles.noneButton]} onPress={handleNoneOfThese}>
            <Text style={styles.buttonText}>Ninguno / Volver a intentar</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (config) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: config.COLORS.BACKGROUND || '#f1faee',
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'railway',
    color: config.COLORS.TEXT,
  },
  imagePreview: {
    width: '80%',
    height: 200,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: config.COLORS.LIGHT_ACCENT || '#ddd',
  },
  list: {
    width: '100%',
    marginBottom: 20,
  },
  suggestionItem: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    borderColor: config.COLORS.PRIMARY + '80',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'industrial',
    color: config.COLORS.PRIMARY,
  },
  suggestionConfidence: {
    fontSize: 13,
    color: config.COLORS.DARK_ACCENT,
    marginTop: 4,
  },
  button: {
    backgroundColor: config.COLORS.PRIMARY,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    width: '80%',
    marginBottom: 10,
  },
  noneButton: {
    backgroundColor: config.COLORS.SECONDARY,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'industrial',
  },
});

export default SuggestionScreen;
