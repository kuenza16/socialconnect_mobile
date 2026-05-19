import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import AppHeader from "@/components/AppHeader";
import { Colors, Spacing, Typography } from "@/constants/Colors";
import API from "@/services/api";
import PostCard, { Post } from "../../components/PostCard";
import { useAuth } from "../../hooks/useAuth";

export default function MyProfileScreen() {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  const loadMyPosts = useCallback(async () => {
    if (!user?._id) {
      return;
    }

    const { data } = await API.get<any>(`/users/${user._id}`);
    setPosts(Array.isArray(data?.posts) ? data.posts : []);
  }, [user?._id]);

  useEffect(() => {
    loadMyPosts();
  }, [loadMyPosts]);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="My Profile" subtitle={user?.email} />

      <FlatList
        data={posts}
        keyExtractor={(item, index) =>
          String(item._id ?? item.id ?? `post-${index}`)
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <Text style={styles.name}>{user?.name}</Text>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?._id}
            currentUserName={user?.name}
            fallbackAuthorName={user?.name}
            onRefresh={loadMyPosts}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContent: {
    padding: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: Typography.headline,
    color: Colors.black,
    fontWeight: "700",
  },
  logoutButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
  },
  logoutText: {
    color: Colors.white,
    fontWeight: "700",
  },
});
