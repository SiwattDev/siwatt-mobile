import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { ActivityIndicator, Card, DefaultTheme, Text } from "react-native-paper";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { db } from "../../../firebase";

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

function VisitData({ route }) {
    const [loading, setLoading] = useState(true)
    const [visitData, setVisitData] = useState()
    const { visitId } = route.params

    const getPeriodOfDay = (date) => {
        const hour = date.getHours()
        if (hour < 6) return 'Madrugada'
        else if (hour < 12) return 'Manhã'
        else if (hour < 18) return 'Tarde'
        else return 'Noite'
    }

    const getDayOfWeek = date => {
        const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
        return daysOfWeek[date.getDay()]
    }

    useEffect(() => {
        getDoc(doc(db, 'visits', visitId)).then((snapshot) => {
            const data = snapshot.data()
            setVisitData(data)
            setLoading(false)
            console.log(parseFloat(data.locationData.latitude), parseFloat(data.locationData.longitude))
        })
    }, [])

    if (loading) {
        return (
            <View style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator />
                <Text selectable style={{ marginTop: 10 }}>Carregando...</Text>
            </View>
        )
    }

    return (
        <ScrollView>
            <View style={styles.container}>
                <Card style={{ backgroundColor: '#ffffff', marginBottom: 10 }}>
                    <Card.Content>
                        <Text selectable variant="titleMedium" style={{ marginBottom: 10 }}>ID da visita: {visitId}</Text>
                    </Card.Content>
                </Card>
                <Card style={{ backgroundColor: '#ffffff', marginBottom: 10 }}>
                    <Card.Content>
                        <View style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Icon name='map-clock' size={20} /><Text selectable variant="titleMedium">Local, Data e Hora da Visita</Text>
                        </View>
                        <MapView
                            style={{ width: '100%', height: 150, marginTop: 10 }}
                            provider={PROVIDER_GOOGLE}
                            initialRegion={{
                                latitude: parseFloat(visitData.locationData.latitude),
                                longitude: parseFloat(visitData.locationData.longitude),
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: parseFloat(visitData.locationData.latitude),
                                    longitude: parseFloat(visitData.locationData.longitude),
                                }}
                                title="Local da Visita"
                                description={`Ponto identificado do local da visita.`}
                            />
                        </MapView>
                        <View style={{ display: 'flex', flexDirection: 'row', gap: 0, width: '100%' }}>
                            <Card style={{ marginTop: 10, backgroundColor: '#ffffff', width: '50%', borderRadius: 0, borderTopStartRadius: 10, borderBottomStartRadius: 10 }}>
                                <Card.Content style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                    <View>
                                        <Text selectable>
                                            <Icon name="calendar" size={30} />
                                        </Text>
                                    </View>
                                    <View>
                                        <Text selectable style={{ textAlign: 'center' }} variant="bodyMedium">{getDayOfWeek(new Date(visitData.date))}</Text>
                                        <Text selectable style={{ textAlign: 'center' }} variant="bodyMedium">{new Date(visitData.date).toLocaleDateString('pt-BR')}</Text>
                                    </View>
                                </Card.Content>
                            </Card>
                            <Card style={{ marginTop: 10, backgroundColor: '#ffffff', width: '50%', borderRadius: 0, borderTopEndRadius: 10, borderBottomEndRadius: 10 }}>
                                <Card.Content style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                    <View>
                                        <Text selectable>
                                            <Icon name="clock-outline" size={30} />
                                        </Text>
                                    </View>
                                    <View>
                                        <Text selectable style={{ textAlign: 'center' }} variant="bodyMedium">{getPeriodOfDay(new Date(visitData.date))}</Text>
                                        <Text selectable style={{ textAlign: 'center' }} variant="bodyMedium">{new Date(visitData.date).toLocaleTimeString()}</Text>
                                    </View>
                                </Card.Content>
                            </Card>
                        </View>
                    </Card.Content>
                </Card>
                <Card style={{ backgroundColor: '#ffffff', marginBottom: 10 }}>
                    <Card.Content>
                        <View style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Icon name='account-circle' size={20} /><Text selectable variant="titleMedium">Dados do Cliente</Text>
                        </View>
                        <Text selectable variant="bodyMedium"><Text selectable style={{ fontWeight: 'bold' }}>Nome:</Text> {visitData.clientData.name}</Text>
                        {visitData.clientData.fantasyName && <Text selectable variant="bodyMedium"><Text selectable style={{ fontWeight: 'bold' }}>Nome Fantasia:</Text> {visitData.clientData.fantasyName}</Text>}
                        <Text selectable variant="bodyMedium"><Text selectable style={{ fontWeight: 'bold' }}>{visitData.clientData.cpf ? 'CPF' : 'CNPJ'}:</Text> {visitData.clientData.cpf || visitData.clientData.cnpj}</Text>
                        <Text selectable variant="bodyMedium"><Text selectable style={{ fontWeight: 'bold' }}>Telefone:</Text> {visitData.clientData.phone}</Text>
                    </Card.Content>
                </Card>
                <Card style={{ backgroundColor: '#ffffff', marginBottom: 10 }}>
                    <Card.Content>
                        <View style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Icon name='image' size={20} /><Text selectable variant="titleMedium">Imagens da Visita</Text>
                        </View>
                        {visitData.visitImages && visitData.visitImages.map((image, index) => (
                            <View style={{ position: 'relative' }} key={index}>
                                <Image source={{ uri: image }} style={{ width: '100%', height: undefined, aspectRatio: 1, marginTop: 10, borderRadius: 10 }} />
                                <TouchableOpacity onPress={() => Linking.openURL(bill.energyBill)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                            </View>
                        ))}
                        {!visitData.visitImages && <Text selectable variant="bodyMedium" style={{ textAlign: 'center' }}>Nenhuma imagem encontrada</Text>}
                    </Card.Content>
                </Card>
                {visitData.energyBills && (
                    <Card style={{ backgroundColor: '#ffffff', marginBottom: 10 }}>
                        <Card.Content>
                            <View style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 15 }}>
                                <Icon name='file-document-multiple' size={20} /><Text selectable variant="titleMedium">Contas de Energia</Text>
                            </View>
                            {visitData.energyBills && visitData.energyBills.map((bill, index) => (
                                <Card key={index} style={{ backgroundColor: '#ffffff', marginBottom: 10 }}>
                                    <Card.Content>
                                        <Text selectable variant="bodyMedium" style={{ fontWeight: 'bold' }}>Conta {index + 1}</Text>
                                        <View style={{ position: 'relative' }}>
                                            <Image source={{ uri: bill.energyBill }} style={{ width: '100%', height: undefined, aspectRatio: 1, marginTop: 10, borderRadius: 10 }} />
                                            <TouchableOpacity onPress={() => Linking.openURL(bill.energyBill)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                                        </View>
                                        <View style={{ position: 'relative' }}>
                                            <Image source={{ uri: bill.energyBillGraph }} style={{ width: '100%', height: undefined, aspectRatio: 1, marginTop: 10, borderRadius: 10 }} />
                                            <TouchableOpacity onPress={() => Linking.openURL(bill.energyBillChart)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                                        </View>
                                    </Card.Content>
                                </Card>
                            ))}
                        </Card.Content>
                    </Card>
                )}
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
})

export default VisitData