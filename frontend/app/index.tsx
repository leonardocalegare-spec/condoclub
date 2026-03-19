import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { Button } from '../src/components/Button';

const { width } = Dimensions.get('window');

type AuthMode = 'welcome' | 'login' | 'register';

export default function Index() {
  const { isLoading, isAuthenticated, membership, login, loginWithEmail, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (membership) {
        router.replace('/(tabs)');
      } else {
        router.replace('/building/join');
      }
    }
  }, [isLoading, isAuthenticated, membership]);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email, password);
      console.log('Email login completed');
    } catch (error: any) {
      console.error('Email login error', error);
      Alert.alert('Erro', error.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      console.log('Registration completed');
    } catch (error: any) {
      console.error('Registration error', error);
      Alert.alert('Erro', error.message || 'Falha no cadastro');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Carregando..." />;
  }

  if (isAuthenticated) {
    return <LoadingScreen message="Entrando..." />;
  }

  if (mode === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => setMode('welcome')}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>

            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Entrar</Text>
              <Text style={styles.formSubtitle}>Acesse sua conta CondoClub</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Sua senha"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title="Entrar"
                onPress={handleEmailLogin}
                loading={loading}
                style={styles.submitButton}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                title="Continuar com Google"
                onPress={login}
                variant="outline"
                style={styles.googleButton}
              />

              <TouchableOpacity
                style={styles.switchMode}
                onPress={() => setMode('register')}
              >
                <Text style={styles.switchText}>Não tem conta? </Text>
                <Text style={styles.switchLink}>Cadastre-se</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (mode === 'register') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => setMode('welcome')}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>

            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Criar Conta</Text>
              <Text style={styles.formSubtitle}>Junte-se ao CondoClub</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title="Criar conta"
                onPress={handleRegister}
                loading={loading}
                style={styles.submitButton}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                title="Continuar com Google"
                onPress={login}
                variant="outline"
                style={styles.googleButton}
              />

              <TouchableOpacity
                style={styles.switchMode}
                onPress={() => setMode('login')}
              >
                <Text style={styles.switchText}>Já tem conta? </Text>
                <Text style={styles.switchLink}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Welcome screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="business" size={48} color="#fff" />
          </View>
          <Text style={styles.logoText}>CondoClub</Text>
          <Text style={styles.tagline}>Clube de compras exclusivo para condomínios</Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="people" size={24} color="#2563EB" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Compra Coletiva</Text>
              <Text style={styles.featureDesc}>Junte-se aos vizinhos e economize</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="pricetag" size={24} color="#2563EB" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Até 45% de desconto</Text>
              <Text style={styles.featureDesc}>Quanto mais participantes, maior o desconto</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark" size={24} color="#2563EB" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Fornecedores Verificados</Text>
              <Text style={styles.featureDesc}>Serviços de qualidade garantida</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Continuar com Google"
            onPress={login}
            size="large"
            style={styles.loginButton}
          />
          
          <Button
            title="Entrar com E-mail"
            onPress={() => setMode('login')}
            variant="outline"
            size="large"
            style={styles.emailButton}
          />

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => setMode('register')}
          >
            <Text style={styles.registerText}>Não tem conta? </Text>
            <Text style={styles.registerLinkText}>Cadastre-se</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
          </Text>
        </View>
      </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  formHeader: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    flex: 1,
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  submitButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#999',
  },
  googleButton: {
    marginBottom: 16,
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  switchText: {
    fontSize: 14,
    color: '#666',
  },
  switchLink: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  featuresContainer: {
    marginTop: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    marginTop: 40,
  },
  loginButton: {
    width: '100%',
    marginBottom: 12,
  },
  emailButton: {
    width: '100%',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLinkText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
