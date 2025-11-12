import {
    collection,
    doc,
    onSnapshot,
    runTransaction,
    Timestamp,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    FlatList,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebase/config';
import { ShopItem, UserStats } from '../../types'; // UnlockedItem is not needed here

// Merged type for our UI
type ShopItemDisplay = ShopItem & {
  isOwned: boolean;
};

export default function ShopScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [masterShopList, setMasterShopList] = useState<ShopItem[]>([]);
  const [unlockedItemIds, setUnlockedItemIds] = useState<Set<string>>(new Set());
  const [shopItems, setShopItems] = useState<ShopItemDisplay[]>([]); // The final merged list
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: theme.background,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 10,
        marginTop: 40,
    },
    coinDisplay: {
        fontSize: 18,
        fontWeight: '600',
        color: '#E6A700',
        textAlign: 'right',
        marginBottom: 20,
    },
    itemCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.card,
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.text,
    },
    buttonContainer: {
        minWidth: 100,
        alignItems: 'flex-end',
    },
    ownedText: { // Renamed from equippedText
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.textSecondary,
    },
    });

  // --- 1. Listen to User Stats (for coin total) ---
  useEffect(() => {
    if (!user) return;
    const userStatsRef = doc(db, 'users', user.uid);
    const unsubStats = onSnapshot(userStatsRef, (doc) => {
      setUserStats(doc.data() as UserStats);
    });
    return () => unsubStats();
  }, [user]);

  // --- 2. Listen to Master Shop List ---
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const shopItemsRef = collection(db, 'shopItems');
    const unsubShop = onSnapshot(shopItemsRef, (shopSnapshot) => {
      const list = shopSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as ShopItem)
      );
      setMasterShopList(list);
      setLoading(false);
    });
    return () => unsubShop();
  }, [user]);

  // --- 3. Listen to User's Unlocked Items (in real-time) ---
  useEffect(() => {
    if (!user) return;
    const unlockedItemsRef = collection(db, 'users', user.uid, 'unlockedItems');
    const unsubUnlocked = onSnapshot(unlockedItemsRef, (unlockedSnapshot) => {
      const ids = new Set(unlockedSnapshot.docs.map((doc) => doc.id));
      setUnlockedItemIds(ids);
    });
    return () => unsubUnlocked();
  }, [user]);

  // --- 4. MERGE the lists whenever they change ---
  useEffect(() => {
    // This effect runs when the master list OR the user's owned list changes
    const mergedItems = masterShopList.map((item) => ({
      ...item,
      isOwned: unlockedItemIds.has(item.id),
    }));
    setShopItems(mergedItems);
  }, [masterShopList, unlockedItemIds]); // Re-run merge when data changes

  // --- 5. Purchase Logic (unchanged, but now the UI will react) ---
  const handlePurchase = async (item: ShopItem) => {
    if (!user || !userStats) return;

    if (userStats.coins < item.cost) {
      Alert.alert('Not Enough Coins', "You don't have enough coins to buy this.");
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Are you sure you want to buy "${item.name}" for ${item.cost} coins?`,
      [
        { text: 'Cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            setLoading(true);
            try {
              const userStatsRef = doc(db, 'users', user.uid);
              const newItemRef = doc(db, 'users', user.uid, 'unlockedItems', item.id);

              await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userStatsRef);
                if (!userDoc.exists()) throw new Error('User not found');
                
                const currentCoins = userDoc.data()?.coins || 0;
                if (currentCoins < item.cost) throw new Error('Not enough coins');

                transaction.set(newItemRef, {
                  id: item.id,
                  name: item.name,
                  type: item.type,
                  unlockedAt: Timestamp.now(),
                });

                transaction.update(userStatsRef, {
                  coins: currentCoins - item.cost,
                });
              });

              Alert.alert('Purchase Successful!', `You bought "${item.name}"!`);
            } catch (error) {
              console.error('Purchase failed:', error);
              Alert.alert('Error', 'Purchase failed. Please try again.');
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  // --- 6. Render Function (simplified) ---
  const renderItem = ({ item }: { item: ShopItemDisplay }) => {
    const getButton = () => {
      if (item.isOwned) {
        return <Text style={styles.ownedText}>Owned</Text>;
      }
      return (
        <Button
          title={`Buy (${item.cost} 💰)`}
          onPress={() => handlePurchase(item)}
        />
      );
    };

    return (
      <View style={styles.itemCard}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.buttonContainer}>{getButton()}</View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shop</Text>
      <Text style={styles.coinDisplay}>
        Your Coins: {userStats?.coins ?? 0} 💰
      </Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={shopItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text>No items in shop.</Text>}
        />
      )}
    </View>
  );
}