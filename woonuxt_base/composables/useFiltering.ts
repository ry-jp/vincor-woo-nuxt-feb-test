
export function useFiltering() {
  const route = useRoute();
  const router = useRouter();
  const runtimeConfig = useRuntimeConfig();
  const { updateProductList } = useProducts();

  const filterQuery = useState<string>('filter', () => '');

  filterQuery.value = route.query.filter as string;

  function getFilter(filterName: string): string[] {
    return filterQuery.value?.split(`${filterName}[`)[1]?.split(']')[0]?.split(',') || [];
  }

  function setFilter(filterName: string, filterValue: string[]) {
    let newFilterQuery = filterQuery.value || '';

    if (!filterQuery.value?.includes(filterName)) {
      newFilterQuery = filterQuery.value ? `${filterQuery.value},${filterName}[${filterValue}]` : `${filterName}[${filterValue}]`;
    } else {
      newFilterQuery = !filterValue.length
        ? filterQuery.value.replace(`${filterName}[${getFilter(filterName)}]`, '')
        : filterQuery.value.replace(`${filterName}[${getFilter(filterName)}]`, `${filterName}[${filterValue}]`);
    }

    newFilterQuery = newFilterQuery.replace(/^,/, '').replace(/,$/, '');
    newFilterQuery = newFilterQuery.replace(/,{2,}/g, ',');

    filterQuery.value = newFilterQuery;

    router.push({ query: { ...route.query, filter: newFilterQuery } });

    const path = route.path.includes('/page/') ? route.path.split('/page/')[0] : route.path;

    if (!newFilterQuery) {
      router.push({
        path,
        query: { ...route.query, filter: undefined },
      });
    } else {
      router.push({
        path,
        query: { ...route.query, filter: newFilterQuery },
      });
    }

    setTimeout(() => {
      updateProductList();
    }, 50);
  }

  function resetFilter(): void {
    const { scrollToTop } = useHelpers();
    filterQuery.value = '';
    router.push({ query: { ...route.query, filter: undefined } });

    setTimeout(() => {
      updateProductList();
      scrollToTop();
    }, 50);
  }

  const isFiltersActive = computed<boolean>(() => !!filterQuery.value);

  function filterProducts(products: Product[]): Product[] {
    console.log('Filtering products with query:', filterQuery.value);
    console.log('Products before filtering:', products);

    const categoryFilter = getFilter('category') || [];
    const priceRange = getFilter('price') || [];
    const starRating = getFilter('rating') || [];
    const globalProductAttributes = runtimeConfig?.public?.GLOBAL_PRODUCT_ATTRIBUTES?.map((attribute: any) => attribute.slug) || [];
    const onSale = getFilter('sale') || [];

    return products.filter((product) => {
      console.log('Checking product:', product.name);

      const categoryCondition = categoryFilter.length
        ? product.productCategories?.nodes?.some((node: any) => categoryFilter.includes(node.slug))
        : true;
      console.log('Category condition:', categoryCondition);

      const productPrice = product.rawPrice ? parseFloat([...product.rawPrice.split(',')].reduce((a, b) => String(Math.max(Number(a), Number(b))))) : 0;
      const priceCondition = priceRange.length
        ? productPrice >= parseFloat(priceRange[0]) && productPrice <= parseFloat(priceRange[1])
        : true;
      console.log('Price condition:', priceCondition);

      const ratingCondition = starRating.length
        ? (product?.averageRating ?? 0) >= parseFloat(starRating[0])
        : true;
      console.log('Rating condition:', ratingCondition);

      const attributeCondition = globalProductAttributes
        .map((attribute: string) => {
          const attributeValues = getFilter(attribute) || [];
          if (!attributeValues.length) return true;
          return product.terms?.nodes?.some((node: any) => node.taxonomyName === attribute && attributeValues.includes(node.slug));
        })
        .every((condition: any) => condition);
      console.log('Attribute condition:', attributeCondition);

      const saleItemsOnlyCondition = onSale.length ? product.onSale : true;
      console.log('Sale condition:', saleItemsOnlyCondition);

      const result = ratingCondition && priceCondition && attributeCondition && categoryCondition && saleItemsOnlyCondition;
      console.log('Final result for product:', product.name, result);
      return result;
    });
  }

  return { getFilter, setFilter, resetFilter, isFiltersActive, filterProducts };
}
