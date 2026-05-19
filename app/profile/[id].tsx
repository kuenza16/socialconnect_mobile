import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import AppHeader from "@/components/AppHeader";
import PostCard, { Post } from "@/components/PostCard";
import { Colors, Spacing, Typography } from "@/constants/Colors";
import API from "@/services/api";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  bio?: string;
  posts?: Post[];
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const { data } = await API.get<UserProfile>(`/users/${id}`);
      setProfile(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={profile?.name || "Profile"} subtitle={profile?.email} />

      <FlatList
        data={profile?.posts || []}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <View style={styles.infoBlock}>
            <Text style={styles.bio}>{profile?.bio || "No bio provided"}</Text>
            <Text style={styles.postsTitle}>Posts</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard post={item} onRefresh={loadProfile} />
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
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  infoBlock: {
    padding: Spacing.lg,
  },
  bio: {
    fontSize: Typography.bodyLarge,
    color: Colors.gray,
  },
  postsTitle: {
    marginTop: Spacing.md,
    fontSize: Typography.title,
    fontWeight: "700",
    color: Colors.black,
  },
});
