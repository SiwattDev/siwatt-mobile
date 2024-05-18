import axios from 'axios'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import * as Location from 'expo-location'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { maskBr, validateBr } from 'js-brasil'
import React, { useEffect, useState } from 'react'
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Card, DefaultTheme, RadioButton, Text, TextInput } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { db, storage } from '../../firebase'

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

function NewVisit() {
    const [typeEntity, setTypeEntity] = useState('legal-entity')
    const [location, setLocation] = useState(null)
    const [address, setAddress] = useState(null)
    const [cityState, setCityState] = useState(null)
    const [date, setDate] = useState(new Date())
    const [clientData, setClientData] = useState({})
    const [initialCheckDone, setInitialCheckDone] = useState(false)
    const [selectedImages, setSelectedImages] = useState([])
    const [haveEnergyBills, setHaveEnergyBills] = useState(false)
    const [showAddEnergyBills, setShowAddEnergyBills] = useState(false)
    const [activeEnergyBill, setActiveEnergyBill] = useState({})
    const [energyBills, setEnergyBills] = useState([])
    const [comment, setComment] = useState('')
    const [loading, setLoading] = useState(false)
    const [userLoading, setUserLoading] = useState(true)
    const [user, setUser] = useState()

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

    const pickDocument = async (multiple, callback = () => { }) => {
        let result = await DocumentPicker.getDocumentAsync({
            type: "image/*",
            multiple,
        })

        if (!result.canceled && result.assets.length > 0) {
            result.assets.forEach(async (asset) => {
                let base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem?.EncodingType?.Base64 })
                asset.base64 = base64
                console.log(result.assets)
            })
            console.log('Assets', result.assets, 'after')
            callback(multiple ? result.assets : result.assets[0])
        }
    }

    useEffect(() => {
        const auth = getAuth()
        onAuthStateChanged(auth, (user) => {
            if (user) {
                getDoc(doc(db, "users", user.uid)).then((document) => {
                    if (document.exists()) {
                        Alert.alert('Você entrou com o usuário ' + document.data().name, 'E-mail: ' + document.data().email);
                        setUser({
                            ...user,
                            ...document.data()
                        })
                    }
                })
            }
            else navigation.navigate('Login')
            setUserLoading(false)
        })
    }, [])

    useEffect(() => {
        let unsubscribe

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert('Impossível continuar', 'A permissão para acessar a localização foi negada')
                return
            }

            let lastSpeed = 0

            const isMoving = (currentSpeed) => {
                const stationarySpeedThreshold = 0.2
                const speedDifference = Math.abs(currentSpeed - lastSpeed)
                lastSpeed = currentSpeed
                const isMoving = !initialCheckDone || speedDifference > stationarySpeedThreshold
                setInitialCheckDone(true)
                console.log('speed', speedDifference)
                console.log('initialCheckDone', initialCheckDone)
                console.log('isMoving', isMoving)
                return isMoving
            }

            let locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 1000,
                    distanceInterval: 1,
                },
                (newLocation) => {
                    const { latitude, longitude, speed } = newLocation.coords
                    setLocation({ latitude, longitude })
                    console.log(`Latitude: ${latitude}, Longitude: ${longitude}`)

                    if (isMoving(speed)) {
                        axios
                            .get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyAeOJrvDZOVM5_X-6uGan_Cu0ZiPH5HGVw`)
                            .then((response) => {
                                if (response.data.results && response.data.results.length > 0) {
                                    console.log(response.data.results[0].address_components)
                                    const addressComponents = response.data.results[0].address_components
                                    const streetNumber = addressComponents.find((component) =>
                                        component.types.includes('street_number')
                                    ).long_name
                                    const streetName = addressComponents.find((component) => component.types.includes('route'))
                                        .long_name
                                    const neighborhoodName = addressComponents.find((component) =>
                                        component.types.includes('sublocality_level_1')
                                    ).long_name
                                    const city = addressComponents.find((component) =>
                                        component.types.includes('administrative_area_level_2')
                                    ).long_name
                                    const state = addressComponents.find((component) =>
                                        component.types.includes('administrative_area_level_1')
                                    ).short_name
                                    setAddress(`${streetName}, ${streetNumber} - ${neighborhoodName}`)
                                    setCityState(`${city} - ${state}`)
                                } else {
                                    console.error('No results returned by Google Maps Geocoding API')
                                }
                            })
                            .catch((error) => console.error(error))
                    } else {
                        console.log('Device stopped. Not updating location.')
                    }
                }
            )

            unsubscribe = () => locationSubscription.remove()
        })()

        const timer = setInterval(() => {
            setDate(new Date())
        }, 1000)

        return () => {
            clearInterval(timer)
            if (unsubscribe) {
                unsubscribe()
            }
        }
    }, [])

    useEffect(() => {
        console.log(activeEnergyBill)
    }, [activeEnergyBill])

    useEffect(() => {
        console.log(clientData)
        if (
            clientData &&
            typeEntity === 'legal-entity' &&
            clientData?.cnpj &&
            validateBr.cnpj(clientData?.cnpj)
        ) {
            const url = clientData.cnpj ? 'https://api.cnpjs.dev/v1/' + clientData.cnpj.replace(/\D/g, '') : ''
            console.log(url)
            axios
                .get(url)
                .then((response) => {
                    console.log(response.data)
                    setClientData((prevData) => ({
                        ...prevData,
                        name: response.data.razao_social,
                        fantasyName: response.data.nome_fantasia,
                    }))
                })
                .catch((error) => console.error(error))
        }
    }, [clientData.cnpj, typeEntity])

    const generateCode = () => {
        const length = 15
        let result = ''
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        const charactersLength = characters.length
        for (let i = 0; i < length; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength)
            )
        }
        return result
    }

    const createDocument = (path, id, data) => {
        return new Promise((resolve, reject) => {
            if (id)
                setDoc(doc(db, path, id), data)
                    .then(() => resolve(id))
                    .catch((error) => reject(error))
            else
                addDoc(collection(db, path), data)
                    .then((docRef) => resolve(docRef))
                    .catch((error) => {
                        console.error(error)
                        reject(error)
                    })
        })
    }

    const saveVisit = async () => {
        if (!location) {
            Alert.alert('Dados faltando', 'Desculpe, algum problema ocorreu obtendo o endereço. Você pode: \n1. Verificar se o GPS está ligado. \n2. Verificar a conexão com a Internet. \n3. Tentar novamente mais tarde.')
            return
        }
        if (!clientData.cpf && typeEntity === 'individuals') {
            Alert.alert('Campos não preenchidos', 'Por favor, preencha o CPF.')
            return
        }
        if (!clientData.cnpj && typeEntity === 'legal-entity') {
            Alert.alert('Campos não preenchidos', 'Por favor, preencha o CNPJ.')
            return
        }
        if (!clientData.name) {
            Alert.alert('Campos não preenchidos', 'Por favor, preencha a Razão Social.')
            return
        }
        if (typeEntity === 'legal-entity' && !clientData.fantasyName) {
            Alert.alert('Campos não preenchidos', 'Por favor, preencha o Nome Fantasia.')
            return
        }
        if (!clientData.phone) {
            Alert.alert('Campos não preenchidos', 'Por favor, preencha o Telefone.')
            return
        }
        if (selectedImages.length < 2) {
            Alert.alert('Campos não preenchidos', 'Selecione pelo menos duas imagens da visita.')
            return
        }
        if (haveEnergyBills && energyBills.length === 0) {
            Alert.alert('Campos não preenchidos', 'Adicione pelo menos uma conta de energia.')
            return
        }
        if (comment.length < 50) {
            Alert.alert('Campos não preenchidos', 'O comentário deve ter no mínimo 50 caracteres.')
            return
        }

        setLoading(true)
        const saveImage = async (image) => {
            const imageUri = image.uri
            const response = await fetch(imageUri)
            const blob = await response.blob()
            const timeHash = Date.now()

            const storageRef = ref(storage, `visits/${timeHash}_${image.name}`)

            try {
                await uploadBytes(storageRef, blob)
                const imageUrl = await getDownloadURL(storageRef)
                return imageUrl
            } catch (error) {
                console.error('Erro ao salvar imagem:', error)
                throw new Error('Erro ao salvar imagem')
            }
        }

        try {
            if (!user) {
                Alert.alert('Erro', 'Nenhum usuário autenticado. Por favor, autentique-se e tente novamente.')
                throw new Error('Nenhum usuário autenticado')
            }
            const imageUrls = await Promise.all(selectedImages.map(saveImage))
            const id = generateCode()

            const data = {
                id,
                clientData,
                visitImages: imageUrls,
                comment: comment.toString(),
                locationData: location,
                date: Date.now(),
                user: user.uid,
            }

            if (haveEnergyBills) {
                const energyBillsData = await Promise.all(energyBills.map(async (bill) => {
                    const imageUrls = {
                        energyBill: await saveImage(bill.energyBill),
                        energyBillGraph: await saveImage(bill.energyBillGraph),
                    }
                    console.log(imageUrls)
                    return imageUrls
                }))
                console.log(energyBillsData)
                data['energyBills'] = energyBillsData
            }
            console.log(data)
            await createDocument('visits', id, data)
            setLoading(false)
            Alert.alert('Muito bom!', 'Visita salva com sucesso!')
        } catch (error) {
            console.error('Erro ao salvar visita:', error)
            Alert.alert('Oops!', 'Algo deu errado. Por favor, tente novamente mais tarde.')
        }
    }

    if (userLoading) {
        return (
            <View style={{ ...styles.container, display: loading ? 'none' : 'flex' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        )
    }

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ ...styles.container, display: loading ? 'none' : 'flex' }}>
                <Text selectable variant="titleLarge">Sua localização</Text>
                <Card style={{ marginTop: 10, backgroundColor: '#ffffff' }}>
                    <Card.Content style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>
                        <View>
                            <Text selectable variant="titleMedium">{address ? address : 'Carregando...'}</Text>
                            <Text selectable variant="bodyMedium">{cityState ? cityState : 'Carregando...'}</Text>
                        </View>
                        <View>
                            <Text selectable>
                                <Icon name="map-marker-radius" size={40} color={theme.colors.primary} />
                            </Text>
                        </View>
                    </Card.Content>
                </Card>
                <View style={{ display: 'flex', flexDirection: 'row', gap: 0, width: '100%' }}>
                    <Card style={{ marginTop: 10, backgroundColor: '#ffffff', width: '50%', borderRadius: 0, borderTopStartRadius: 10, borderBottomStartRadius: 10 }}>
                        <Card.Content style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                            <View>
                                <Text selectable>
                                    <Icon name="calendar" size={30} color={theme.colors.primary} />
                                </Text>
                            </View>
                            <View>
                                <Text selectable style={{ textAlign: 'center' }} variant="bodyMedium">{date ? getDayOfWeek(date) : 'Carregando...'}</Text>
                                <Text selectable style={{ textAlign: 'center' }} variant="bodyMedium">{date ? date.toLocaleDateString('pt-BR') : 'Carregando...'}</Text>
                            </View>
                        </Card.Content>
                    </Card>
                    <Card style={{ marginTop: 10, backgroundColor: '#ffffff', width: '50%', borderRadius: 0, borderTopEndRadius: 10, borderBottomEndRadius: 10 }}>
                        <Card.Content style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                            <View>
                                <Text selectable>
                                    <Icon name="clock-outline" size={30} color={theme.colors.primary} />
                                </Text>
                            </View>
                            <View>
                                <Text selectable style={{ textAlign: 'center' }} variant="bodyMedium">{date ? `${getPeriodOfDay(date)}` : 'Carregando...'}</Text>
                                <Text selectable style={{ textAlign: 'center' }} variant="bodyMedium">{date ? `${date.toLocaleTimeString()}` : 'Carregando...'}</Text>
                            </View>
                        </Card.Content>
                    </Card>
                </View>
                <Card style={{ marginTop: 10, backgroundColor: '#ffffff' }}>
                    <Card.Content>
                        <RadioButton.Group onValueChange={(newValue) => {
                            setTypeEntity(newValue)
                            setClientData({})
                        }} value={typeEntity}>
                            <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', paddingStart: 10, paddingEnd: 10 }}>
                                <View style={{ display: 'flex', flexDirection: 'row', gap: 0, alignItems: 'center' }}>
                                    <Text selectable>Pessoa Física</Text>
                                    <RadioButton value="individuals" />
                                </View>
                                <View style={{ display: 'flex', flexDirection: 'row', gap: 0, alignItems: 'center' }}>
                                    <Text selectable>Pessoa Jurídica</Text>
                                    <RadioButton value="legal-entity" />
                                </View>
                            </View>
                        </RadioButton.Group>
                        {typeEntity === 'individuals' && (
                            <TextInput
                                label='CPF'
                                mode='outlined'
                                style={{ backgroundColor: '#ffffff', marginTop: 10 }}
                                value={clientData.cpf}
                                onChangeText={(text) => {
                                    setClientData((prevData) => ({
                                        ...prevData,
                                        cpf: text,
                                    }))
                                }}
                            />
                        )}
                        {typeEntity === 'legal-entity' && (
                            <TextInput
                                label='CNPJ'
                                mode='outlined'
                                style={{ backgroundColor: '#ffffff', marginTop: 10 }}
                                value={clientData.cnpj}
                                onChangeText={(text) => {
                                    let value = text
                                    if (validateBr.cnpj(text)) value = maskBr.cnpj(text)
                                    setClientData((prevData) => ({
                                        ...prevData,
                                        cnpj: value,
                                    }))
                                }}
                            />
                        )}
                        <TextInput
                            label='Razão Social'
                            mode='outlined'
                            style={{ backgroundColor: '#ffffff', marginTop: 10 }}
                            value={clientData.name}
                            onChangeText={(text) => {
                                setClientData((prevData) => ({
                                    ...prevData,
                                    name: text,
                                }))
                            }}
                        />
                        {typeEntity === 'legal-entity' && (
                            <TextInput
                                label='Nome Fantasia'
                                mode='outlined'
                                style={{ backgroundColor: '#ffffff', marginTop: 10 }}
                                value={clientData.fantasyName}
                                onChangeText={(text) => {
                                    setClientData((prevData) => ({
                                        ...prevData,
                                        fantasyName: text,
                                    }))
                                }}
                            />
                        )}
                        <TextInput
                            label='Telefone'
                            mode='outlined'
                            style={{ backgroundColor: '#ffffff', marginTop: 10 }}
                            value={clientData.phone}
                            onChangeText={(text) => {
                                let value = text
                                if (validateBr.celular(value)) value = maskBr.celular(value)
                                setClientData((prevData) => ({
                                    ...prevData,
                                    phone: value,
                                }))
                            }}
                        />
                    </Card.Content>
                </Card>
                <Card style={{ marginTop: 10, backgroundColor: '#ffffff' }}>
                    <Card.Content>
                        <Text selectable variant='titleMedium'>Imagens da Visita</Text>
                        <Button mode='contained' buttonColor={theme.colors.secondary} textColor='#000' style={{ marginTop: 10 }} icon='image' onPress={() => pickDocument(true, (urls) => setSelectedImages(urls))}> Carregar imagens</Button>
                        <Card style={{ marginTop: 10, backgroundColor: '#ffffff' }}>
                            <Card.Content>
                                <Text selectable variant='titleMedium'>Imagens Selecionadas</Text>
                                {selectedImages.length > 0 ? (
                                    <Card style={{ marginTop: 10, backgroundColor: '#ffffff' }}>
                                        <Card.Content style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {selectedImages.map((image, index) => <Image source={{ uri: `data:image/png;base64,${image.base64}` }} style={{ width: 80, height: 80, borderRadius: 5 }} key={index} />)}
                                        </Card.Content>
                                    </Card>
                                ) : <Text selectable variant='bodyMedium' style={{ marginTop: 10, marginBottom: 10, textAlign: 'center' }}>Nenhuma imagem selecionada</Text>
                                }
                            </Card.Content>
                        </Card>
                    </Card.Content>
                </Card>
                <Card style={{ marginTop: 10, backgroundColor: '#ffffff' }}>
                    <Card.Content>
                        <Text selectable variant='titleMedium' style={{ textAlign: 'center' }}>Você tem alguma conta de energia do cliente disponível?</Text>
                        <RadioButton.Group onValueChange={(newValue) => setHaveEnergyBills(newValue)} value={haveEnergyBills}>
                            <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', paddingStart: 50, paddingEnd: 50 }}>
                                <View style={{ display: 'flex', flexDirection: 'row', gap: 0, alignItems: 'center' }}>
                                    <Text selectable>Sim</Text>
                                    <RadioButton value={true} />
                                </View>
                                <View style={{ display: 'flex', flexDirection: 'row', gap: 0, alignItems: 'center' }}>
                                    <Text selectable>Não</Text>
                                    <RadioButton value={false} />
                                </View>
                            </View>
                        </RadioButton.Group>
                        {haveEnergyBills && energyBills.length > 0 && (
                            <View>
                                <Text selectable variant='bodyMedium' style={{ marginTop: 10 }}>Contas de Energia adicionadas:</Text>
                                {energyBills.map((bill, index) => (
                                    <Card style={{ marginTop: 10, backgroundColor: '#ffffff' }} key={index}>
                                        <Card.Content>
                                            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
                                                    <Card style={{ backgroundColor: '#fff' }}>
                                                        <Card.Content style={{ flexDirection: 'column', gap: 5, justifyContent: 'center', alignItems: 'center' }}>
                                                            <Text selectable style={{ fontSize: 10 }}>Foto da conta</Text>
                                                            <Image source={{ uri: `data:image/png;base64,${bill.energyBill.base64}` }} style={{ width: 70, height: 70, borderRadius: 5 }} />
                                                        </Card.Content>
                                                    </Card>
                                                    <Card style={{ backgroundColor: '#fff' }}>
                                                        <Card.Content style={{ flexDirection: 'column', gap: 5, justifyContent: 'center', alignItems: 'center' }}>
                                                            <Text selectable style={{ fontSize: 10 }}>Foto do gráfico</Text>
                                                            <Image source={{ uri: `data:image/png;base64,${bill.energyBillGraph.base64}` }} style={{ width: 70, height: 70, borderRadius: 5 }} />
                                                        </Card.Content>
                                                    </Card>
                                                </View>
                                                <Button mode='contained' buttonColor={theme.colors.black} textColor='#fff' style={{ marginTop: 10, width: 41, padding: 0, paddingLeft: 15, minWidth: 0, borderRadius: 50 }} icon='delete' onPress={() => setEnergyBills(energyBills.filter((_, i) => i !== index))}></Button>
                                            </View>
                                        </Card.Content>
                                    </Card>
                                ))}
                            </View>
                        )}
                        {haveEnergyBills && energyBills.length === 0 && (
                            <Text selectable variant='bodyMedium' style={{ marginTop: 10, textAlign: 'center' }}>Nenhuma conta de energia adicionada</Text>
                        )}
                        {haveEnergyBills && showAddEnergyBills && (
                            <Card style={{ marginTop: 10, backgroundColor: '#ffffff' }}>
                                <Card.Content>
                                    <Text selectable variant='titleMedium'>Selecione as imagens da conta de energia:</Text>
                                    <Button mode='contained' buttonColor={theme.colors.black} textColor='#fff' style={{ marginTop: 10, borderRadius: 8 }} icon='file-document' onPress={() => pickDocument(false, url => setActiveEnergyBill({ ...activeEnergyBill, energyBill: url }))}> Foto da conta de energia</Button>
                                    <Button mode='contained' buttonColor={theme.colors.black} textColor='#fff' style={{ marginTop: 10, borderRadius: 8 }} icon='chart-bar' onPress={() => pickDocument(false, url => setActiveEnergyBill({ ...activeEnergyBill, energyBillGraph: url }))}> Foto do gráfico de consumo</Button>
                                    <Card style={{ marginTop: 10, backgroundColor: '#ffffff' }}>
                                        <Card.Content style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
                                            <View style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center', justifyContent: 'center', paddingLeft: 5, paddingRight: 5 }}>
                                                <Text selectable style={{ marginBottom: 10 }}>Foto da conta:</Text>
                                                {activeEnergyBill.energyBill ? <Image source={{ uri: `data:image/png;base64,${activeEnergyBill.energyBill.base64}` }} style={{ width: 110, height: 110, borderRadius: 5 }} /> : <Image source={{ uri: 'https://via.placeholder.com/110x110' }} style={{ width: 110, height: 110, borderRadius: 5 }} />}
                                            </View>
                                            <View style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center', justifyContent: 'center', paddingLeft: 5, paddingRight: 5 }}>
                                                <Text selectable style={{ marginBottom: 10 }}>Foto do gráfico:</Text>
                                                {activeEnergyBill.energyBillGraph ? <Image source={{ uri: `data:image/png;base64,${activeEnergyBill.energyBillGraph.base64}` }} style={{ width: 110, height: 110, borderRadius: 5 }} /> : <Image source={{ uri: 'https://via.placeholder.com/110x110' }} style={{ width: 110, height: 110, borderRadius: 5 }} />}
                                            </View>
                                        </Card.Content>
                                    </Card>
                                    <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', gap: 0, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                                        <Button mode='contained' buttonColor={theme.colors.black} textColor='#fff' style={{ marginTop: 10, width: 42, padding: 0, paddingLeft: 15, minWidth: 0, borderRadius: 50 }} icon='plus' onPress={() => {
                                            if (activeEnergyBill.energyBill && activeEnergyBill.energyBillGraph) {

                                                setShowAddEnergyBills(false)
                                                setEnergyBills([...energyBills, activeEnergyBill])
                                                setActiveEnergyBill({})
                                            } else {
                                                Alert.alert('Erro', 'Selecione as imagens da conta de energia!')
                                            }
                                        }}></Button>
                                        <Button mode='contained' buttonColor={theme.colors.black} textColor='#fff' style={{ marginTop: 10, width: 42, padding: 0, paddingLeft: 15, minWidth: 0, borderRadius: 50 }} icon='close' onPress={() => setShowAddEnergyBills(false)}></Button>
                                    </View>
                                </Card.Content>
                            </Card>
                        )}
                        {haveEnergyBills && (
                            <Button mode='contained' buttonColor={theme.colors.soft} textColor='#000' style={{ marginTop: 10, borderRadius: 8, width: 200, }} icon='file-plus' onPress={() => setShowAddEnergyBills(true)}> Adicionar uma conta</Button>
                        )}
                    </Card.Content>
                </Card>
                <Text selectable variant='titleMedium' style={{ marginTop: 10 }}>Comentário:</Text>
                <TextInput
                    multiline={true}
                    numberOfLines={100}
                    placeholder='Conte uma história da visita ao cliente...'
                    mode='outlined'
                    value={comment}
                    onChangeText={text => setComment(text)}
                    style={{ height: 200, textAlignVertical: 'top', backgroundColor: '#ffffff', marginTop: 10 }} />
                <Button mode='contained' buttonColor={theme.colors.secondary} textColor='#000' style={{ marginTop: 10 }} icon='card-account-details' onPress={saveVisit}> Salvar Visita</Button>
            </View>
            {loading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 9999, backgroundColor: '#f5f5f5' }}>
                    <ActivityIndicator style={{ zIndex: 9999 }} />
                    <Text selectable style={{ marginTop: 10, zIndex: 9999 }}>Salvando...</Text>
                </View>
            )}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
})

export default NewVisit