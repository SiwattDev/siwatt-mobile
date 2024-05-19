import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-gesture-handler';
import { DefaultTheme, PaperProvider } from 'react-native-paper';
import Main from './components/Main';

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
        <NavigationContainer>
            <PaperProvider theme={theme}>
                <StatusBar style='dark' />
                <Main />
            </PaperProvider>
        </NavigationContainer>
    );
}

export default App