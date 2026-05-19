import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import AppHeader from "@/components/AppHeader";
import UserCard, { UserItem } from "@/components/UserCard";
import { Colors, Spacing, Typography } from "@/constants/Colors";
import API from "@/services/api";

export default function UsersScreen() {
  const [requests, setRequests] = useState<UserItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const normalizeUser = (raw: any, index: number): UserItem => ({
    _id: String(raw?._id ?? raw?.id ?? `user-${index}`),
    name: String(raw?.name ?? raw?.username ?? raw?.fullName ?? "Unknown user"),
    email: String(raw?.email ?? ""),
    bio: raw?.bio ? String(raw.bio) : undefined,
  });

  const loadData = useCallback(async () => {
    try {
      const [requestsRes, usersRes] = await Promise.all([
        API.get<UserItem[]>("/friends/requests"),
        API.get<UserItem[]>("/users"),
      ]);

      const normalizedRequests = Array.isArray(requestsRes.data)
        ? requestsRes.data.map(normalizeUser)
        : [];
      const normalizedUsers = Array.isArray(usersRes.data)
        ? usersRes.data.map(normalizeUser)
        : [];

      setRequests(normalizedRequests);
      setUsers(normalizedUsers);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to load users",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAccept = async (id: string) => {
    try {
      await API.put(`/friends/accept/${id}`);
      loadData();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to accept request",
      );
    }
  };

  const handleAddFriend = async (id: string) => {
    try {
      await API.post(`/friends/request/${id}`);
      Alert.alert("Success", "Friend request sent");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to send request",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Users" subtitle="Find and connect with people" />

      <FlatList
        data={users}
        keyExtractor={(item, index) => String(item._id ?? `user-${index}`)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friend requests</Text>
            {requests.length === 0 ? (
              <Text style={styles.emptyText}>No pending requests</Text>
            ) : (
              <>
                {requests.map((item, index) => {
                  const userId = String(item._id ?? `request-${index}`);

                  return (
                    <UserCard
                      key={`request-${userId}-${index}`}
                      user={item}
                      buttonLabel="Accept"
                      onPress={() => {
                        if (!userId || userId.startsWith("request-")) {
                          return;
                        }
                        router.push(`/profile/${userId}`);
                      }}
                      onPressButton={() => {
                        if (!userId || userId.startsWith("request-")) {
                          return;
                        }
                        handleAccept(userId);
                      }}
                    />
                  );
                })}
              </>
            )}

            <Text style={[styles.sectionTitle, styles.allUsersTitle]}>
              All users
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const userId = String(item._id ?? `user-${index}`);

          return (
            <UserCard
              user={item}
              buttonLabel="Add"
              onPress={() => {
                if (!userId || userId.startsWith("user-")) {
                  return;
                }
                router.push(`/profile/${userId}`);
              }}
              onPressButton={() => {
                if (!userId || userId.startsWith("user-")) {
                  return;
                }
                handleAddFriend(userId);
              }}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    fontSize: Typography.title,
    fontWeight: "700",
    color: Colors.black,
  },
  allUsersTitle: {
    marginTop: Spacing.sm,
  },
  emptyText: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    color: Colors.gray,
    fontSize: Typography.body,
  },
});
