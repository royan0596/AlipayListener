import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  NativeModules,
  NativeEventEmitter,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { NotificationModule } = NativeModules;
const notificationEmitter = new NativeEventEmitter(NotificationModule);
const Tab = createBottomTabNavigator();

const HomeScreen = () => {
  const [serverUrl, setServerUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const subscription = notificationEmitter.addListener(
      'onNotificationReceived',
      (event: any) => {
        const time = new Date().toLocaleTimeString();
        let logMsg = '';
        if (event.amount && event.amount !== "0.00") {
             logMsg = `[${time}] 收款成功: ${event.amount}元`;
        } else {
             logMsg = `[${time}] 收到通知 (未解析到金额):\n${event.title}`;
        }
        addLog(logMsg);
        
        if (serverUrl) {
           uploadNotification(event);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [serverUrl]);

  const loadSettings = async () => {
    try {
      const url = await AsyncStorage.getItem('server_url');
      if (url) setServerUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('server_url', serverUrl);
      Alert.alert('保存成功', '接口地址已保存');
    } catch (e) {
      Alert.alert('保存失败', '无法保存接口地址');
    }
  };

  const openNotificationSettings = () => {
    NotificationModule.openNotificationSettings();
  };

  const toggleListening = () => {
    const time = new Date().toLocaleTimeString();
    if (isListening) {
      NotificationModule.stopListening();
      setIsListening(false);
      addLog(`[${time}] 监听已停止`);
    } else {
      NotificationModule.startListening();
      setIsListening(true);
      addLog(`[${time}] 监听已启动`);
    }
  };

  const addLog = (msg: string) => {
    setLogs(prevLogs => [msg, ...prevLogs]);
  };
  
  const clearLogs = () => {
      setLogs([]);
  };

  const testApi = async () => {
      if (!serverUrl) {
          Alert.alert('提示', '请先设置接口地址');
          return;
      }
      
      const testData = {
          title: "测试通知",
          text: "这是一条测试数据",
          amount: "1.00",
          timestamp: Date.now()
      };

      uploadNotification(testData);
  };

  const uploadNotification = async (data: any) => {
      const time = new Date().toLocaleTimeString();
      try {
          addLog(`[${time}] 正在上报到: ${serverUrl}`);
          
          const payload = {
              title: data.title || "支付宝通知",
              text: data.text || `收到一笔转账 ${data.amount || "0.00"} 元`,
              bigText: data.bigText || data.text || "",
              subText: data.subText || "交易提醒",
              ticker: data.ticker || "支付宝通知"
          };
          
          addLog(`[${time}] 发送数据: ${JSON.stringify(payload)}`);

          const response = await fetch(serverUrl, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
          });
          
          if (response.ok) {
              addLog(`[${time}] 上报成功: ${response.status}`);
          } else {
              addLog(`[${time}] 上报失败: ${response.status}`);
          }
      } catch (error: any) {
          addLog(`[${time}] 上报异常: ${error.message}`);
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>星核支付宝通知监测</Text>
      </View>

      <View style={styles.configSection}>
        <Text style={styles.label}>接口地址 (Webhook):</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://your-server.com/api/callback"
          placeholderTextColor="#999"
        />
        <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={saveSettings}>
              <Text style={styles.buttonText}>保存配置</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.permButton]} onPress={openNotificationSettings}>
              <Text style={styles.buttonText}>开启权限</Text>
            </TouchableOpacity>
        </View>
        <View style={styles.listenRow}>
            <TouchableOpacity 
                style={[styles.button, styles.listenButton, isListening ? styles.stopButton : styles.startButton]} 
                onPress={toggleListening}
            >
                <Text style={styles.buttonText}>{isListening ? '停止监听' : '启动监听'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.testButton]} onPress={testApi}>
                <Text style={styles.buttonText}>测试接口</Text>
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.logHeader}>
          <Text style={styles.label}>实时日志 (调试用):</Text>
          <TouchableOpacity onPress={clearLogs}>
              <Text style={styles.clearText}>清空</Text>
          </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.logContainer}>
        {logs.length === 0 ? (
          <Text style={styles.emptyLog}>暂无日志，请尝试转账...</Text>
        ) : (
          logs.map((log, index) => (
            <View key={index} style={styles.logItem}>
              <Text style={styles.logText}>{log}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const AboutScreen = () => {
  const openTelegram = () => {
      Linking.openURL('https://t.me/zhanghaogo').catch(err => 
        Alert.alert('错误', '无法打开 Telegram，请确保已安装应用')
      );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>关于我们</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.aboutContainer}>
        <View style={styles.card}>
            <Text style={styles.cardTitle}>声明</Text>
            <Text style={styles.cardText}>本 APP 完全免费，仅供学习和个人使用。我们承诺不会偷传任何数据，所有数据仅发送至您配置的 Webhook 地址。代码开源，欢迎审查。</Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.cardTitle}>联系作者</Text>
            <Text style={styles.cardText}>如果您在使用过程中遇到任何问题，或有定制开发需求，请通过 Telegram 联系。</Text>
            <TouchableOpacity onPress={openTelegram}>
                <Text style={styles.linkText}>https://t.me/zhanghaogo</Text>
            </TouchableOpacity>
            <Text style={styles.hintText}>(点击链接直接跳转)</Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.cardTitle}>上报格式说明</Text>
            <Text style={styles.cardText}>当监听到支付宝通知时，App 会向配置的 Webhook 地址发送 POST 请求。</Text>
            <Text style={styles.codeBlock}>
{`POST /your-api-path
Content-Type: application/json

{
  "title": "支付宝通知",
  "text": "收到一笔转账 100.00 元",
  "bigText": "收到一笔转账 100.00 元",
  "subText": "交易提醒",
  "ticker": "支付宝通知"
}`}
            </Text>
            <Text style={styles.cardText}>注意：请确保您的服务器能正确接收并解析 JSON 数据。</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator 
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#1677FF',
          tabBarInactiveTintColor: 'gray',
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = '';

            if (route.name === '监控') {
              iconName = 'monitor';
            } else if (route.name === '关于') {
              iconName = 'info-outline';
            }

            // You can return any component that you like here!
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="监控" component={HomeScreen} />
        <Tab.Screen name="关于" component={AboutScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#1677FF',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  configSection: {
    padding: 20,
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#1677FF',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  permButton: {
      backgroundColor: '#52C41A',
      marginRight: 0,
  },
  listenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  listenButton: {
    marginRight: 10,
    flex: 1, 
  },
  testButton: {
      backgroundColor: '#FAAD14', // 黄色
      flex: 1,
      marginRight: 0,
  },
  startButton: {
    backgroundColor: '#1890FF',
  },
  stopButton: {
    backgroundColor: '#FF4D4F',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginTop: 10,
  },
  clearText: {
      color: '#1677FF',
      fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
    margin: 15,
    marginTop: 5,
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 10,
  },
  emptyLog: {
      color: '#888',
      textAlign: 'center',
      marginTop: 20,
  },
  logItem: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingBottom: 5,
  },
  logText: {
    color: '#00FF00', // Hacker green
    fontFamily: 'monospace',
    fontSize: 12,
  },
  aboutContainer: {
      padding: 15,
  },
  card: {
      backgroundColor: 'white',
      borderRadius: 10,
      padding: 20,
      marginBottom: 15,
      elevation: 2,
  },
  cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      color: '#333',
  },
  cardText: {
      fontSize: 14,
      color: '#666',
      marginBottom: 10,
      lineHeight: 20,
  },
  linkText: {
      fontSize: 16,
      color: '#1677FF',
      fontWeight: 'bold',
      textDecorationLine: 'underline',
      marginBottom: 5,
  },
  hintText: {
      fontSize: 12,
      color: '#999',
  },
  codeBlock: {
      backgroundColor: '#F0F0F0',
      padding: 10,
      borderRadius: 5,
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#333',
      marginBottom: 10,
  }
});

export default App;