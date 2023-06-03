import { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  Button,
  Platform,
  FlatList,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export default function App() {
  useEffect(() => {
    token = registerForPushNotificationsAsync();
    setExpoPushToken(token);
  }, []);
  const [userId, setUserId] = useState('163');
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  const [data, setData] = useState([]);
  const fetchData = async () => {
    console.log('Fetching data...');
    const url =
      'http://dev-lb-subscribite-234585004.us-west-2.elb.amazonaws.com/subscriptions/upcoming_orders'; // Replace with your API endpoint URL
    const finalData = [];

    try {
      const response = await axios.post(url, { user_id: userId });
      // setData(response.data); // Assuming the API response is an array of items
      const res = response.data;
      // console.log(res);
      // console.log(JSON.stringify(response.data));
      for (const date in res) {
        // for every date, get the associated items
        const items = res[date];
        // console.log(items);
        // for every item in the array, add a newItem object to finalData
        items.forEach((item) => {
          const newItem = {
            id: item.id,
            date: item.delivery_date,
            timeslot: item.time_slot_id,
            timeslot_description: item.time_slot_description,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            price: item.price,
          };
          finalData.push(newItem);
        });
      }
      setData([...finalData]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    // console.log(finalData[0]);

    // finalData is now an array of indidivudal delivery items, transform it to the desired map
    const result = [];

    finalData.forEach((item) => {
      const { date, timeslot, timeslot_description, price } = item;
      const dateOnly = new Date(date).toISOString().split('T')[0]; // Extracting only the date part
      const key = `${dateOnly}__${timeslot}`;
      const existingEntry = result.find((entry) => entry.key === key);

      if (existingEntry) {
        existingEntry.items.push(item);
        existingEntry.totalCost += price;
      } else {
        let newEntry = {
          key: key,
          dateOnly: dateOnly,
          timeslot: timeslot_description,
          items: [item],
          totalCost: price,
        };
        result.push(newEntry);
      }
    });

    // console.log(result);

    setData([...result]);
  };
  // const handleNotification = (cost) => {
  //   // send notification here
  //   console.log(`Cost: ${cost} delivered!`);
  //   res = await schedulePushNotification(cost);
  //   console.log(res);
  // };
  const renderItem = ({ item }) => {
    return (
      <Pressable
        // style={({ pressed }) => {
        //   [styles.itemContainer, pressed ? styles.pressed : null];
        // }}
        style={({ pressed }) => {
          return [styles.itemContainer, pressed && styles.pressed];
        }}
        onPress={async () => {
          await sendPushNotification(item.totalCost);
        }}
      >
        <View style={styles.section}>
          <Text style={styles.keyText}>{item.dateOnly}</Text>
          <Text style={styles.keyText}>{item.timeslot}</Text>
        </View>
        <View style={styles.section}>
          <FlatList
            data={item.items}
            keyExtractor={(subItem, index) => index.toString()}
            renderItem={({ item: subItem }) => (
              <View style={styles.row}>
                <Text style={styles.cell}>
                  {subItem.name} | {subItem.quantity} pc
                </Text>
              </View>
            )}
          />
        </View>
        <View style={[styles.section, styles.cost]}>
          <Text style={styles.totalCostText}>${item.totalCost}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flex: 1,
        // alignItems: 'center',
        // justifyContent: 'space-around',
        marginTop: '25%',
      }}
    >
      <View style={styles.listArea}>
        <FlatList
          data={data}
          keyExtractor={(item, index) => `${item.key}_${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.flatListContent}
        />
      </View>
      <View style={styles.formArea}>
        <Button title='Fetch Data' onPress={fetchData} />
      </View>
    </View>
  );
}
const sendPushNotification = async (cost) => {
  const message = {
    to: 'ExponentPushToken[64Vv7jKWAaMg-56FJrbNYs]',
    sound: 'default',
    title: 'Check your doorstep!📬',
    body: `Your order has been delivered! $${cost} will be deducted from your account.`,
    data: { someData: 'goes here' },
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    console.log('Notification sent successfully:', response);
  } catch (error) {
    console.log('Error sending notification:', error);
  }
};

// this schedules local notifications
// async function schedulePushNotification(cost) {
//   // console.log(`The notification set to send to: ${expoPushToken}`);
//   const response = await Notifications.scheduleNotificationAsync({
//     content: {
//       title: 'Check your doorstep!📬',
//       body: `Your order has been delivered! $${cost} will be deducted from your account.`,
//       subtitle: 'This is a subtitle',
//       data: {
//         data: `Order number: ${Math.floor(Math.random() * 10) + 1}`,
//       },
//       // sticky: true,
//       // autoDismiss: false,
//     },
//     trigger: { seconds: 1 },
//   });
//   return response;
// }

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log(finalStatus);
    if (finalStatus !== 'granted') {
      const { status2 } = await Notifications.requestPermissionsAsync();
      finalStatus = status2;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    const projectId = '7877e9e1-c511-4982-97dc-61067cc16bca';
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log(`Actual Device token: ${token}`);
  } else {
    alert('Must use physical device for Push Notifications');
  }
  // Gauri iPhone token
  token = 'ExponentPushToken[64Vv7jKWAaMg-56FJrbNYs]';

  return token;
}

const styles = StyleSheet.create({
  itemContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'lightgray',
  },
  section: {
    flex: 1,
    marginLeft: 5,
    flexGrow: 1,
    // borderColor: 'red',
    // borderWidth: 2,
  },
  keyText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  totalCostText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  itemText: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'lightgray',
  },
  cell: {
    flex: 1,
  },
  cost: {
    maxWidth: '20%',
    marginRight: 5,
    paddingHorizontal: 0,
  },
  pressed: {
    // backgroundColor: 'red',
    opacity: 0.5,
  },
  flatListContent: {
    flexGrow: 1,
  },
  listArea: {
    maxHeight: '90%',
  },
  formArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputField: {
    borderWidth: 1,
    borderColor: 'black',
  },
});
