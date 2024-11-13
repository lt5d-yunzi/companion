import { useComputed } from '../util.js'
import { go as fuzzySearch } from 'fuzzysort'
import type { NewClientModuleInfo } from '@companion-app/shared/Model/ModuleInfo.js'
import type { ModuleStoreListCacheEntry } from '@companion-app/shared/Model/ModulesStore.js'
import type { ModuleInfoStore } from '../Stores/ModuleInfoStore.js'

export function useAllConnectionProducts(modules: ModuleInfoStore): FuzzyProduct[] {
	return useComputed(() => {
		const allProducts: Record<string, FuzzyProduct> = {}

		// Start with all installed modules
		for (const moduleInfo of modules.modules.values()) {
			for (const product of moduleInfo.baseInfo.products) {
				const key = `${moduleInfo.baseInfo.id}-${product}`
				allProducts[key] = {
					id: moduleInfo.baseInfo.id,

					installedInfo: moduleInfo,
					storeInfo: null,

					product,
					keywords: moduleInfo.baseInfo.keywords?.join(';') ?? '',
					name: moduleInfo.baseInfo.name,
					manufacturer: moduleInfo.baseInfo.manufacturer,
					shortname: moduleInfo.baseInfo.shortname,
				}
			}
		}

		// Add in the store modules
		for (const moduleInfo of modules.storeList.values()) {
			for (const product of moduleInfo.products) {
				const key = `${moduleInfo.id}-${product}`

				const installedInfo = allProducts[key]
				if (installedInfo) {
					installedInfo.storeInfo = moduleInfo
				} else {
					allProducts[key] = {
						id: moduleInfo.id,

						installedInfo: null,
						storeInfo: moduleInfo,

						product,
						keywords: moduleInfo.keywords?.join(';') ?? '',
						name: moduleInfo.name,
						manufacturer: moduleInfo.manufacturer,
						shortname: moduleInfo.shortname,
					}
				}
			}
		}

		return Object.values(allProducts)
	}, [modules])
}

export function filterProducts(allProducts: FuzzyProduct[], filter: string): FuzzyProduct[] {
	if (!filter) return allProducts //.map((p) => p.info)

	return fuzzySearch(filter, allProducts, {
		keys: ['product', 'name', 'manufacturer', 'keywords'] satisfies Array<keyof FuzzyProduct>,
		threshold: -10_000,
	}).map((x) => x.obj)
}

export interface FuzzyProduct {
	id: string

	installedInfo: NewClientModuleInfo | null
	storeInfo: ModuleStoreListCacheEntry | null

	product: string
	keywords: string
	name: string
	manufacturer: string
	shortname: string
}
