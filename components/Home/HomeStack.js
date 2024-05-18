import { createStackNavigator } from '@react-navigation/stack';
import Login from './../Auth/Login';
import Home from './Home';
import VisitData from './VisitData/VisitData';

const Stack = createStackNavigator();

function HomeStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false
            }}
        >
            <Stack.Screen name="Visitas" component={Home} />
            <Stack.Screen name="Dados da Visita" component={VisitData} />
            <Stack.Screen name="Login" component={Login} />
        </Stack.Navigator>
    );
}

export default HomeStack