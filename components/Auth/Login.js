import { useNavigation } from "@react-navigation/native"
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { useEffect, useState } from "react"
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native"
import { Button, Text, TextInput } from "react-native-paper"
import { db } from "../../firebase"

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const navigation = useNavigation();

    const auth = () => {
        const auth = getAuth();
        signInWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user
                console.log('User', user)
                const document = await getDoc(doc(db, "users", user.uid))
                console.log('Document', document)
                if (document.exists()) {
                    Alert.alert('Você entrou com o usuário ' + document.data().name, 'E-mail: ' + document.data().email)
                    navigation.navigate('Visitas')
                } else {
                    console.log("No such document!")
                    Alert.alert('Oops!', 'Algo está errado, por favor, tente novamente ou entre em contato com o desenvolvedor')
                }
            })
            .catch((error) => {
                const errorCode = error.code;
                let errorMessage = error.message;
                switch (errorCode) {
                    case 'auth/user-not-found':
                        errorMessage = 'Usuário não encontrado'
                        break
                    case 'auth/wrong-password':
                        errorMessage = 'Senha inválida'
                        break
                    case 'auth/too-many-requests':
                        errorMessage = 'Muitas tentativas. Tente novamente mais tarde'
                        break
                    case 'auth/invalid-email':
                        errorMessage = 'E-mail inválido'
                        break
                    case 'auth/network-request-failed':
                        errorMessage = 'Falha de rede'
                        break
                    case 'auth/operation-not-allowed':
                        errorMessage = 'Operação não permitida'
                        break
                    case 'auth/invalid-credential':
                        errorMessage = 'Credencial inválida'
                        break
                    case 'auth/user-disabled':
                        errorMessage = 'Usuário desabilitado'
                        break
                    case 'auth/invalid-email':
                        errorMessage = 'E-mail inválido'
                        break
                    case 'auth/missing-email':
                        errorMessage = 'E-mail ausente'
                        break
                    case 'auth/missing-password':
                        errorMessage = 'Senha ausente'
                        break
                    default:
                        break

                }
                Alert.alert('Erro', errorMessage)
                console.log(errorCode, errorMessage)
            });
        console.log(email, password)
        setEmail('')
        setPassword('')
    }

    useEffect(() => {
        const auth = getAuth()
        onAuthStateChanged(auth, (user) => {
            if (user) {
                getDoc(doc(db, "users", user.uid)).then((document) => {
                    if (document.exists()) navigation.navigate('Visitas')
                    else Alert.alert('Oops!', 'Algo está errado, por favor, tente novamente ou entre em contato com o desenvolvedor')
                })
            }
            else navigation.navigate('Login')
        })
    })

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.container}>
                <View style={{ marginBottom: 80 }}>
                    <Image source={require('../../assets/icon.png')} style={{ width: 90, height: 90, display: 'block', margin: 'auto' }} />
                </View>
                <TextInput
                    style={{ backgroundColor: 'transparent', marginBottom: 40 }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    autoCompleteType="email"
                    mode="flat"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="E-mail"
                    left={<TextInput.Icon icon='email' />}
                />
                <TextInput
                    style={{ backgroundColor: 'transparent', marginBottom: 40 }}
                    mode="flat"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    autoCompleteType="password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Senha"
                    left={<TextInput.Icon icon='lock' />}
                />
                <Button title="Entrar" onPress={auth} mode="contained" style={{ padding: 5, borderRadius: 15 }}><Text style={{ color: '#fff', fontSize: 18 }}>LOGIN</Text></Button>
                <View style={{ marginTop: 170 }}></View>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center'
    },
})

export default Login