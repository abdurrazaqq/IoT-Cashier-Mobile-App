import { Stack, router } from 'expo-router';
import { StyleSheet, Text, View, Image } from 'react-native';
import { useEffect } from 'react';

export default function NotFoundScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login'); // arahkan ke halaman login
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} /> 
      <View style={styles.container}>
        {/* Logo Aplikasi */}
        <Image 
          source={require('../assets/images/Kasirku.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Nama Aplikasi */}
        <Text style={styles.subtitle}>Smart Cashier System</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 180,
    height: 180,
  },
  subtitle: {
    marginTop: 8,        // jarak kecil agar rapat dengan logo
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
    textAlign: 'center',
  },
});
