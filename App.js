import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, View } from 'react-native';
import 'react-native-gesture-handler';
import { Appbar, BottomNavigation, DefaultTheme, PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeStack from './components/Home/HomeStack';
import NewVisit from './components/NewVisit/NewVisit';


const Tab = createBottomTabNavigator();

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

function App() {
    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <PaperProvider theme={theme}>
                    <StatusBar style='dark' />
                    <View>
                        <Appbar.Header style={{ backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#00000020' }} mode='center-aligned'>
                            <Image source={require('./assets/icon.png')} style={{ width: 40, height: 40, marginStart: 10 }} />
                            <Appbar.Content title='CRM - Visita' color='#000' />
                        </Appbar.Header>
                    </View>
                    <Tab.Navigator
                        screenOptions={{
                            headerShown: false,
                        }}
                        tabBar={({ navigation, state, descriptors, insets }) => (
                            <BottomNavigation.Bar
                                theme={{ colors: { secondaryContainer: theme.colors.soft } }}
                                navigationState={state}
                                safeAreaInsets={insets}
                                style={{ backgroundColor: '#fff', marginBottom: -10 }}
                                onTabPress={({ route, preventDefault }) => {
                                    const event = navigation.emit({
                                        type: 'tabPress',
                                        target: route.key,
                                        canPreventDefault: true,
                                    });

                                    if (event.defaultPrevented) {
                                        preventDefault();
                                    } else {
                                        navigation.dispatch({
                                            ...CommonActions.navigate(route.name, route.params),
                                            target: state.key,
                                        });
                                    }
                                }}
                                renderIcon={({ route, focused, color }) => {
                                    const { options } = descriptors[route.key];
                                    if (options.tabBarIcon) {
                                        return options.tabBarIcon({ focused, color, size: 24 });
                                    }

                                    return null;
                                }}
                                getLabelText={({ route }) => {
                                    const { options } = descriptors[route.key];
                                    const label =
                                        options.tabBarLabel !== undefined
                                            ? options.tabBarLabel
                                            : options.title !== undefined
                                                ? options.title
                                                : route.title;

                                    return label;
                                }}
                            />
                        )}
                    >
                        <Tab.Screen
                            name="Home"
                            component={HomeStack}
                            options={{
                                tabBarLabel: 'Início',
                                tabBarIcon: ({ color, size }) => {
                                    return <Icon name="home" size={size} color={color} />;
                                },
                            }}
                        />
                        <Tab.Screen
                            name="New"
                            component={NewVisit}
                            options={{
                                tabBarLabel: 'Novo',
                                tabBarIcon: ({ color, size }) => {
                                    return <Icon name="plus" size={size} color={color} />;
                                },
                            }}
                        />
                    </Tab.Navigator>
                    <View><Text style={{ textAlign: 'center', paddingBottom: 5, color: '#000', fontSize: 10, backgroundColor: '#fff' }}>© {new Date().getFullYear()} - <Image source={require('./assets/vansistem.png')} style={{ width: 10, height: 10, marginStart: 10 }} /> VANSISTEM</Text></View>
                </PaperProvider>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}

export default App