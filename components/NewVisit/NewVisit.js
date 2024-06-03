import axios from 'axios'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { maskBr, validateBr } from 'js-brasil'
import React, { useEffect, useState } from 'react'
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
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
        soft: '#2485f780',
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

    const pickImageFromGallery = async (type) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            base64: true,
        })

        if (!result.canceled && result.assets.length > 0) {
            if (type === 'visit') {
                setSelectedImages([...selectedImages, result.assets[0]]);
            } else if (type === 'energyBill' || type === 'energyBillGraph') {
                setActiveEnergyBill(prev => ({ ...prev, [type]: result.assets[0] }));
            }
        }
    }

    const takePhoto = async (type) => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            base64: true,
        })

        if (!result.canceled && result.assets.length > 0) {
            if (type === 'visit') {
                setSelectedImages([...selectedImages, result.assets[0]]);
            } else if (type === 'energyBill' || type === 'energyBillGraph') {
                setActiveEnergyBill(prev => ({ ...prev, [type]: result.assets[0] }));
            }
        }
    }

    const removeImage = (index) => {
        const updatedImages = [...selectedImages]
        updatedImages.splice(index, 1)
        setSelectedImages(updatedImages)
    }

    useEffect(() => {
        const auth = getAuth()
        onAuthStateChanged(auth, (user) => {
            if (user) {
                getDoc(doc(db, "users", user.uid)).then((document) => {
                    if (document.exists()) {
                        setUser({
                            ...user,
                            ...document.data()
                        })
                    }
                })
            }
            else Alert.alert('Nenhum usuário conectado ', 'Volte a página de Início para fazer login ou feche o CRM Siwatt e abra novamente.')
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
        if (!user) {
            Alert.alert('Erro', 'Nenhum usuário autenticado. Por favor, autentique-se e tente novamente.')
            throw new Error('Nenhum usuário autenticado')
        }
        if (!location) {
            Alert.alert('Dados faltando', 'Desculpe, algum problema ocorreu obtendo o endereço. Você pode: \n1. Verificar se o GPS está ligado. \n2. Verificar a conexão com a Internet. \n3. Fechar e abrir novamente o app e tentar novamente')
            return
        }
        if (typeEntity === 'legal-entity' && !clientData.cnpj) {
            Alert.alert('Dados faltando', 'Por favor, preencha o CNPJ do cliente')
            return
        }
        if (typeEntity === 'individual' && !clientData.cpf) {
            Alert.alert('Dados faltando', 'Por favor, preencha o CPF do cliente')
            return
        }
        if (!clientData.name) {
            Alert.alert('Dados faltando', 'Por favor, preencha o nome do cliente')
            return
        }
        if (typeEntity === 'legal-entity' && !clientData.fantasyName) {
            Alert.alert('Dados faltando', 'Por favor, preencha o nome fantasia do cliente')
            return
        }
        if (!clientData.phone) {
            Alert.alert('Dados faltando', 'Por favor, preencha o telefone do cliente')
            return
        }
        if (!comment) {
            Alert.alert('Dados faltando', 'Por favor, preencha o campo de observação')
            return
        }
        if (haveEnergyBills && energyBills.length === 0) {
            Alert.alert('Dados faltando', 'Por favor, adicione pelo menos uma conta de energia')
            return
        }

        setLoading(true)
        try {
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

            if (typeEntity === 'legal-entity')
                delete data.clientData.cpf
            else delete data.clientData.cnpj

            if (haveEnergyBills) {
                const energyBillsData = await Promise.all(energyBills.map(async (bill) => {
                    const imageUrls = {
                        energyBill: await saveImage(bill.energyBill),
                        energyBillGraph: await saveImage(bill.energyBillGraph),
                    }
                    return imageUrls
                }))
                data['energyBills'] = energyBillsData
            }

            await createDocument('visits', id, data)
            setLoading(false)
            Alert.alert('Muito bom!', 'Visita salva com sucesso!')
        } catch (error) {
            console.error('Erro ao salvar visita:', error)
            Alert.alert('Oops!', 'Algo deu errado. Por favor, tente novamente mais tarde.')
        } finally {
            setLoading(false)
        }
    }

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

    return userLoading ? <ActivityIndicator /> : (
        <ScrollView contentContainerStyle={styles.container}>
            <Card style={styles.card}>
                <Card.Title
                    title={user ? 'Olá, ' + user.name + '.' : 'Olá.'}
                    subtitle={date.toLocaleTimeString('pt-BR') + ', ' + getDayOfWeek(date) + ', ' + date.toLocaleDateString('pt-BR') + '.'}
                    left={(props) => (
                        <Icon
                            {...props}
                            name="hand-wave"
                            style={{ transform: [{ scaleX: -1 }, { translateX: 10 }] }}
                            size={30}
                            color={theme.colors.primary}
                        />
                    )}
                />
                <Card.Content>
                    <Text variant="titleMedium">Sua localização</Text>
                    {!location && <ActivityIndicator />}
                    {location && (
                        <>
                            <Text variant="bodyMedium">{address}</Text>
                            <Text variant="bodyMedium">{cityState}</Text>
                            <MapView
                                style={{ width: '100%', height: 150, marginTop: 10 }}
                                provider={PROVIDER_GOOGLE}
                                initialRegion={{
                                    latitude: parseFloat(location.latitude),
                                    longitude: parseFloat(location.longitude),
                                    latitudeDelta: 0.001,
                                    longitudeDelta: 0.001,
                                }}
                            >
                                <Marker
                                    coordinate={{
                                        latitude: parseFloat(location.latitude),
                                        longitude: parseFloat(location.longitude),
                                    }}
                                    title="Local da Visita"
                                    description={`Ponto identificado do local da visita.`}
                                />
                            </MapView>
                        </>
                    )}
                </Card.Content>
            </Card>
            <Card style={styles.card}>
                <Card.Title
                    title="Dados do Cliente"
                    subtitle="Informe os dados do cliente"
                    left={(props) => (
                        <Icon
                            {...props}
                            name="badge-account-horizontal"
                            size={30}
                            color={theme.colors.primary}
                        />
                    )}
                />
                <Card.Content>
                    <Text variant="titleLarge">Dados do Cliente</Text>
                    <View style={{ ...styles.row, marginBottom: 15 }}>
                        <View style={styles.rowItem}>
                            <RadioButton.Group
                                onValueChange={value => setTypeEntity(value)}
                                value={typeEntity}
                            >
                                <RadioButton.Item
                                    label="Pessoa Física"
                                    value="individual"
                                />
                                <RadioButton.Item
                                    label="Pessoa Jurídica"
                                    value="legal-entity"
                                />
                            </RadioButton.Group>
                        </View>
                    </View>
                    <View style={{ ...styles.row, marginBottom: 15 }}>
                        <View style={styles.rowItem}>
                            <TextInput
                                style={styles.input}
                                label={typeEntity === 'legal-entity' ? 'CNPJ' : 'CPF'}
                                value={clientData?.cnpj || clientData?.cpf || ''}
                                onChangeText={text => {
                                    let value = text
                                    if (validateBr.cnpj(value) || validateBr.cpf(value))
                                        value = typeEntity === 'legal-entity' ? maskBr.cnpj(text) : maskBr.cpf(text)
                                    setClientData(prevData => ({
                                        ...prevData,
                                        cnpj: typeEntity === 'legal-entity' ? value : undefined,
                                        cpf: typeEntity !== 'legal-entity' ? value : undefined
                                    }))
                                }}
                                keyboardType="numeric"
                                mode="outlined"
                                error={
                                    (typeEntity === 'legal-entity' && clientData?.cnpj && !validateBr.cnpj(clientData?.cnpj)) ||
                                    (typeEntity === 'individual' && clientData?.cpf && !validateBr.cpf(clientData?.cpf))
                                }
                            />
                        </View>
                    </View>
                    <View style={{ ...styles.row, marginBottom: 15 }}>
                        <View style={styles.rowItem}>
                            <TextInput
                                style={styles.input}
                                label={typeEntity === 'legal-entity' ? 'Razão Social' : 'Nome'}
                                value={clientData?.name || ''}
                                onChangeText={text => setClientData(prevData => ({
                                    ...prevData,
                                    name: text
                                }))}
                                mode="outlined"
                            />
                        </View>
                    </View>
                    {typeEntity === 'legal-entity' && (
                        <>
                            <View style={{ ...styles.row, marginBottom: 15 }}>
                                <View style={styles.rowItem}>
                                    <TextInput
                                        style={styles.input}
                                        label="Nome Fantasia"
                                        value={clientData?.fantasyName || ''}
                                        onChangeText={text => setClientData(prevData => ({
                                            ...prevData,
                                            fantasyName: text
                                        }))}
                                        mode="outlined"
                                    />
                                </View>
                            </View>
                        </>
                    )}
                    <View style={{ ...styles.row, marginBottom: 15 }}>
                        <View style={styles.rowItem}>
                            <TextInput
                                style={styles.input}
                                label="Telefone"
                                value={clientData?.phone || ''}
                                onChangeText={text => {
                                    let value = text
                                    if (validateBr.telefone(value)) value = maskBr.telefone(text)
                                    setClientData(prevData => ({
                                        ...prevData,
                                        phone: value
                                    }))
                                }}
                                keyboardType="numeric"
                                error={clientData?.phone && !validateBr.telefone(clientData?.phone)}
                                mode="outlined"
                            />
                        </View>
                    </View>
                </Card.Content>
            </Card>
            <Card style={styles.card}>
                <Card.Title
                    title="Imagens da Visita"
                    subtitle="Adicione imagens da visita (min: 2)"
                    left={(props) => (
                        <Icon
                            {...props}
                            name="camera"
                            size={30}
                            color={theme.colors.primary}
                        />
                    )}
                />
                <Card.Content>
                    <View style={styles.imagePickerContainer}>
                        {selectedImages.map((image, index) => (
                            <View key={index} style={styles.imageContainer}>
                                <Image source={{ uri: image.uri }} style={styles.image} />
                                <TouchableOpacity onPress={() => removeImage(index)} style={styles.removeButton}>
                                    <Icon name="close-circle" size={24} color="red" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                    <Button mode="contained" onPress={() => pickImageFromGallery('visit')} style={styles.button}>
                        Selecionar da Galeria
                    </Button>
                    <Button mode="contained" onPress={() => takePhoto('visit')} style={styles.button}>
                        Tirar Foto
                    </Button>
                </Card.Content>
            </Card>
            <Card style={styles.card}>
                <Card.Title
                    title="Observações"
                    subtitle="Adicione comentários sobre a visita"
                    left={(props) => (
                        <Icon
                            {...props}
                            name="comment-text"
                            size={30}
                            color={theme.colors.primary}
                        />
                    )}
                />
                <Card.Content>
                    <TextInput
                        placeholder='Adicione um comentário, história, expectativas...'
                        value={comment}
                        onChangeText={setComment}
                        mode="outlined"
                        multiline
                        style={styles.textArea}
                    />
                </Card.Content>
            </Card>
            <Card style={styles.card}>
                <Card.Title
                    title="Contas de Energia"
                    subtitle="Deseja adicionar contas de energia?"
                    left={(props) => (
                        <Icon
                            {...props}
                            name="file-document"
                            size={30}
                            color={theme.colors.primary}
                        />
                    )}
                />
                <Card.Content>
                    <RadioButton.Group
                        onValueChange={(value) => setHaveEnergyBills(value === 'yes')}
                        value={haveEnergyBills ? 'yes' : 'no'}
                    >
                        <RadioButton.Item label="Sim" value="yes" />
                        <RadioButton.Item label="Não" value="no" />
                    </RadioButton.Group>
                    {haveEnergyBills && (
                        <>
                            {energyBills.length > 0 && (
                                <>
                                    {
                                        energyBills.map((bill, index) => (
                                            <Card key={index} style={styles.card}>
                                                <Card.Title
                                                    title={`Conta de Energia ${index + 1}`}
                                                    left={(props) => (
                                                        <Icon
                                                            {...props}
                                                            name="file-document"
                                                            size={30}
                                                            color={theme.colors.primary}
                                                        />
                                                    )}
                                                />
                                                <Card.Content style={styles.cardContent}>
                                                    <Image source={{ uri: `data:image/png;base64,${bill.energyBill.base64}` }} style={styles.image} />
                                                    <Image source={{ uri: `data:image/png;base64,${bill.energyBillGraph.base64}` }} style={styles.image} />
                                                </Card.Content>
                                            </Card>
                                        ))
                                    }
                                </>
                            )}
                            {showAddEnergyBills && <Card style={styles.card}>
                                <Card.Title title="Adicionar Conta de Energia" />
                                <Card.Content style={styles.cardContent}>
                                    <Button
                                        icon="plus"
                                        mode="outlined"
                                        onPress={() => { // Quando clicar em "Conta de Energia"
                                            Alert.alert(
                                                "Adicionar Conta de Energia",
                                                "Selecione a opção desejada",
                                                [
                                                    { text: "Selecionar da Galeria", onPress: () => pickImageFromGallery('energyBill') },
                                                    { text: "Tirar Foto", onPress: () => takePhoto('energyBill') }
                                                ]
                                            );
                                        }}
                                        style={styles.button}
                                    >
                                        Conta de Energia
                                    </Button>
                                    {activeEnergyBill.energyBill && (
                                        <Image
                                            source={{ uri: `data:image/png;base64,${activeEnergyBill.energyBill.base64}` }}
                                            style={styles.image}
                                        />
                                    )}
                                    <Button
                                        icon="plus"
                                        mode="outlined"
                                        onPress={() => { // Quando clicar em "Gráfico de Consumo"
                                            Alert.alert(
                                                "Adicionar Gráfico de Consumo",
                                                "Selecione a opção desejada",
                                                [
                                                    { text: "Selecionar da Galeria", onPress: () => pickImageFromGallery('energyBillGraph') },
                                                    { text: "Tirar Foto", onPress: () => takePhoto('energyBillGraph') }
                                                ]
                                            );
                                        }}
                                        style={styles.button}
                                    >
                                        Gráfico de Consumo
                                    </Button>
                                    {activeEnergyBill.energyBillGraph && (
                                        <Image
                                            source={{ uri: `data:image/png;base64,${activeEnergyBill.energyBillGraph.base64}` }}
                                            style={styles.image}
                                        />
                                    )}
                                    <View style={{ ...styles.row, justifyContent: 'space-between', width: '100%' }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowAddEnergyBills(false)
                                                setEnergyBills(prev => [...prev, activeEnergyBill])
                                                setActiveEnergyBill({})
                                            }}
                                            style={styles.customButton}
                                        >
                                            <Text><Icon name='check' /> Salvar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowAddEnergyBills(false)
                                                setActiveEnergyBill({})
                                            }}
                                            style={styles.customButton}
                                        >
                                            <Text><Icon name='close' /> Cancelar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Card.Content>
                            </Card>}
                            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start' }}>
                                <TouchableOpacity
                                    onPress={() => setShowAddEnergyBills(true)}
                                    style={{ ...styles.customButton, backgroundColor: theme.colors.soft, borderRadius: 5 }}
                                >
                                    <Text><Icon name='plus' /> Adicionar</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </Card.Content>
            </Card>
            <Button
                icon="content-save"
                mode="contained"
                onPress={saveVisit}
                disabled={loading}
                style={styles.button}
            >
                Salvar Visita
            </Button>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    card: {
        marginVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    imagePickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    imageContainer: {
        position: 'relative',
        marginRight: 10,
        marginBottom: 10,
    },
    removeButton: {
        position: 'absolute',
        top: 0,
        right: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowItem: {
        flex: 1,
    },
    input: {
        backgroundColor: '#fff',
    },
    button: {
        marginVertical: 8,
        width: '100%',
    },
    customButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginVertical: 8,
        backgroundColor: theme.colors.secondary,
        borderRadius: 8
    },
    textArea: {
        height: 150,
        backgroundColor: '#fff',
    },
    cardContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    image: {
        width: 100,
        height: 100,
        margin: 8,
        borderRadius: 8,
    },
    logo: {
        width: 40,
        height: 40,
    },
})

export default NewVisit
