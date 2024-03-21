<template>
      <!-- <nav class="border-b flex gap-8 tabs">
      <a :class="show === post.content ? 'active' : ''" v-for="post in tabPosts" :key="post.id" @click="activeTab = post.content">{{ post.title }}</a>
    </nav>

<div v-html="activeTab"></div> -->

<div>
    <nav class="border-b flex gap-8 tabs">
      <!-- <button type="button" :class="show === index ? 'active' : ''" @click.prevent="showTab(index); activeTab = post.content" v-for="(post, index) in tabPosts" :key="post.id">{{ post.title }}</button> -->
      <button type="button" :class="show === index ? 'active' : ''" @click.prevent="show = index; activeTab = post.content" v-for="(post, index) in tabPosts" :key="post.id">{{ post.title }}</button>
      <!-- <button type="button" :class="show === 0 ? 'active' : ''" @click.prevent="show = 0" v-for="post in tabPosts" :key="post.id" @click="activeTab = post.content">{{ post.title }}</button> -->
      <!-- <button type="button" :class="show === 1 ? 'active' : ''" @click.prevent="show = 1">{{ $t('messages.shop.reviews') }} ({{ product.reviewCount }})</button> REPLACE WITH PDF/DOC TAB -->
    </nav>
    <div class="tab-contents">
      <div class="font-light mt-8 prose" v-html="activeTab" />
    </div>
  </div>

</template>

<script>
import { ref, computed } from 'vue';
// import { useAsyncGql } from '@/composables/useAsyncGql';

export default {
  props: {
    productSku: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { data, error, loading } = useAsyncGql('getPosts');
    const activeTab = ref('');
    const initialTab = activeTab ? 0 : 1;
      const show = ref(initialTab);

    const posts = computed(() => {
      if (data.value && data.value.posts) {
        return data.value.posts.edges.map(({ node }) => ({
          id: node.id,
          title: node.title,
          content: node.content,
          tags: node.tags.edges.map(({ node }) => node.name),
        }));
      }
      return [];
    });

    const tabPosts = computed(() => {
      return posts.value.filter(post => 
        post.tags.some(tag => tag === props.productSku)
      );
    });

    const showTab = (index) => {
      show.value = index;
      activeTab.value = tabPosts.value[index].content;
    };

    watch(tabPosts, (newTabPosts) => {
      if (newTabPosts.length > 0) {
        showTab(0);
      }
    }, { immediate: true });
      // The { immediate: true } option makes sure the watcher runs immediately after the component is created
      


    return { tabPosts, activeTab, showTab };
  },


  
};


</script>

<style lang="postcss" scoped>
.tabs button {
  @apply border-transparent border-b-2 text-lg pb-8;
  margin-bottom: -1px;
}

.tabs button.active {
  @apply border-primary text-primary;
}
</style>