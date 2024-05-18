import { useNavigation } from '@react-navigation/native'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore'
import { maskBr } from 'js-brasil'
import React, { useEffect, useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { ActivityIndicator, Card, DefaultTheme, Text } from 'react-native-paper'
import { db } from '../../firebase'

const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#0656B4',
        secondary: '#FDC611',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3',
        success: '#4caf50',
        black: '#000000',
        soft: '#2485f780'
    },
}

function Home() {
    const [visits, setVisits] = useState([])
    const [loading, setLoading] = useState(true)
    const [userLoading, setUserLoading] = useState(true)
    const navigation = useNavigation();

    useEffect(() => {
        const auth = getAuth()
        onAuthStateChanged(auth, (user) => {
            if (user) {
                getDoc(doc(db, "users", user.uid)).then((document) => {
                    if (document.exists())
                        Alert.alert('Você entrou com o usuário ' + document.data().name, 'E-mail: ' + document.data().email);
                })
            }
            else navigation.navigate('Login')
            setUserLoading(false)
        })
        setLoading(true)
        const unsubscribe = onSnapshot(collection(db, 'visits'), (querySnapshot) => {
            const data = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            setVisits(data)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    return (
        <View style={styles.container}>
            {visits.length > 0 && !loading && !userLoading && (
                <>
                    {visits.map((visit) => (
                        <Card style={{ marginBottom: 10, backgroundColor: '#fff' }} key={visit.id}>
                            <Card.Content>
                                <TouchableOpacity onPress={() => navigation.navigate('Dados da Visita', { visitId: visit.id })}>
                                    <Text selectable variant='titleMedium'>{visit.clientData.fantasyName || visit.clientData.name}</Text>
                                </TouchableOpacity>
                                <Text selectable variant='bodyMedium'>Telefone: {visit.clientData.phone}</Text>
                                <Text selectable variant='bodyMedium'>{visit.clientData.cpf ? 'CPF' : 'CNPJ'}: {visit.clientData.cpf ? maskBr.cpf(visit.clientData.cpf) : visit.clientData.cnpj ? maskBr.cnpj(visit.clientData.cnpj) : ''}</Text>
                                <Text selectable variant='bodyMedium'>Data: {new Date(visit.date).toLocaleDateString()}</Text>
                            </Card.Content>
                        </Card>
                    ))}
                </>
            )}{!loading && !userLoading && visits.length === 0 && (
                <View>
                    <Text selectable>Nenhum registro encontrado</Text>
                </View>
            )}
            {loading || userLoading && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' }}>
                    <ActivityIndicator />
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
})

export default Home