<script setup>
import { provide } from 'vue';
import { useFiltering } from '@/composables/useFiltering';  // Ensure correct path to the composable
import { useProducts } from '@/composables/useProducts';  // Ensure correct path to the composable
import { useRoute } from 'vue-router';

const { setProducts, updateProductList, products } = useProducts();
const route = useRoute();

const { isQueryEmpty } = useHelpers();
const { getFilter, setFilter, isFiltersActive, filterProducts } = useFiltering();  // Use useFiltering here

const { data } = await useAsyncGql('getProducts');
const allProducts = data.value?.products?.nodes ?? [];
setProducts(allProducts);

onMounted(() => {
  if (!isQueryEmpty.value) updateProductList();
});

watch(
  () => route.query,
  () => {
    if (route.name !== 'products') return;
    updateProductList();
  },
);

useHead({
  title: `Products`,
  meta: [{ hid: 'description', name: 'description', content: 'Products' }],
});

// Provide the updateProductList function to child components
provide('updateProductList', (selectedTerms) => {
  const newProducts = filterProducts(products.value);
  setProducts(newProducts);
});
</script>

<template>
  <div class="container flex items-start gap-16" v-if="allProducts.length">
    <Filters />

    <div class="w-full">
      <div class="flex items-center justify-between w-full gap-4 mt-8 md:gap-8">
        <ProductResultCount />
        <OrderByDropdown class="hidden md:inline-flex" />
        <LazyShowFilterTrigger class="md:hidden" />
      </div>
      <ProductGrid />
    </div>
  </div>
  <NoProductsFound v-else>Could not fetch products from your store. Please check your configuration.</NoProductsFound>
</template>
