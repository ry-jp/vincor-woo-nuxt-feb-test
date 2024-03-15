<script setup>
const props = defineProps({
  product: { type: Object, default: null },
});

const { data } = useAsyncGql('getPosts');
const posts = ref([]);

if (data.value && data.value.posts) {
  posts.value = data.value.posts.edges.map(edge => edge.node);
}

const tabPosts = computed(() => {
  return posts.value.filter(post => 
    post.tags.edges.some(edge => edge.node.name === 'tab')
  );
});

const specsPosts = computed(() => {
  return posts.value.filter(post => 
    post.tags.edges.some(edge => edge.node.name === 'specs')
  );
});

const show = ref(0);

// Move 'Specifications' tab to the beginning
if (tabPosts.value.length > 0) {
  const specsTab = tabPosts.value.find(post => post.title === 'Specifications');
  if (specsTab) {
    const specsTabIndex = tabPosts.value.indexOf(specsTab);
    tabPosts.value.splice(specsTabIndex, 1);
    tabPosts.value.unshift(specsTab);
  }
}

const visibleTabPosts = computed(() => {
  return tabPosts.value.filter((post, index) => index === show.value);
});
</script>

<template>
  <div>
    <nav class="border-b flex gap-8 tabs">
      <a :class="show === index ? 'active' : ''" v-for="(post, index) in tabPosts" :key="post.id" @click.prevent="show = index">{{ post.title }}</a>
    </nav>
    <div class="tab-contents">
      <div v-for="(post, index) in visibleTabPosts" :key="post.id" class="font-light mt-8 prose">
        <div v-if="post.tags.edges.some(edge => edge.node.name === product.sku)">
          <h2>Content with matching SKU:</h2>
          <div v-for="post in posts" :key="post.id">
            <h3 v-if="post.title === visibleTabPosts[index].title">{{ post.title }}</h3>
            <p v-if="post.title === visibleTabPosts[index].title" v-html="post.content"></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss">
.tabs a {
  @apply border-transparent border-b-2 text-lg pb-8;
  margin-bottom: -1px;
}

.tabs a.active {
  @apply border-primary text-primary;
}
</style>
