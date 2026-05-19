import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";

import AppHeader from "@/components/AppHeader";
import CreatePost from "@/components/CreatePost";
import { Colors } from "@/constants/Colors";
import API from "@/services/api";
import PostCard, { Post } from "../../components/PostCard";
import { useAuth } from "../../hooks/useAuth";

export default function FeedScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await API.get<Post[]>("/posts");
      setPosts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Home" subtitle="Your social feed" />

      <FlatList
        data={posts}
        keyExtractor={(item, index) =>
          String(item._id ?? item.id ?? `post-${index}`)
        }
        ListHeaderComponent={<CreatePost onCreated={fetchPosts} />}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?._id}
            currentUserName={user?.name}
            onRefresh={fetchPosts}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
});
