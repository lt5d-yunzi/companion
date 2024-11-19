import React, { useContext, useState, useCallback, useRef } from 'react'
import { CAlert, CButton } from '@coreui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faExternalLink, faPlug, faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import { RootAppStoreContext } from '../Stores/RootAppStore.js'
import { observer } from 'mobx-react-lite'
import { SearchBox } from '../Components/SearchBox.js'
import { NewClientModuleVersionInfo2 } from '@companion-app/shared/Model/ModuleInfo.js'
import { AddConnectionModal, AddConnectionModalRef } from './AddConnectionModal.js'
import { RefreshModulesList } from '../Modules/RefreshModulesList.js'
import { LastUpdatedTimestamp } from '../Modules/LastUpdatedTimestamp.js'
import { NonIdealState } from '../Components/NonIdealState.js'
import { Link } from 'react-router-dom'
import { useTableVisibilityHelper, VisibilityButton } from '../Components/TableVisibility.js'
import { WindowLinkOpen } from '../Helpers/Window.js'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { filterProducts, FuzzyProduct, useAllConnectionProducts } from '../Hooks/useFilteredProducts.js'

interface AddConnectionsPanelProps {
	showHelp: (moduleId: string, moduleVersion: NewClientModuleVersionInfo2) => void
	doConfigureConnection: (connectionId: string) => void
}

export const AddConnectionsPanel = observer(function AddConnectionsPanel({
	showHelp,
	doConfigureConnection,
}: AddConnectionsPanelProps) {
	const { modules } = useContext(RootAppStoreContext)
	const [filter, setFilter] = useState('')

	const addRef = useRef<AddConnectionModalRef>(null)
	const addConnection = useCallback((moduleInfo: FuzzyProduct) => {
		addRef.current?.show(moduleInfo)
	}, [])

	const typeFilter = useTableVisibilityHelper('connections-add-type-filter', {
		available: true,
	})

	const allProducts = useAllConnectionProducts(modules)
	const typeProducts = allProducts.filter((p) => !!p.installedInfo || typeFilter.visibility.available)

	let candidates: JSX.Element[] = []
	try {
		const searchResults = filterProducts(typeProducts, filter)

		const candidatesObj: Record<string, JSX.Element> = {}
		for (const moduleInfo of searchResults) {
			candidatesObj[moduleInfo.name] = (
				<AddConnectionEntry
					key={moduleInfo.name}
					moduleInfo={moduleInfo}
					addConnection={addConnection}
					showHelp={showHelp}
				/>
			)
		}

		if (!filter) {
			candidates = Object.entries(candidatesObj)
				.sort((a, b) => {
					const aName = a[0].toLocaleLowerCase()
					const bName = b[0].toLocaleLowerCase()
					if (aName < bName) return -1
					if (aName > bName) return 1
					return 0
				})
				.map((c) => c[1])
		} else {
			candidates = Object.entries(candidatesObj).map((c) => c[1])
		}
	} catch (e) {
		console.error('Failed to compile candidates list:', e)

		candidates = []
		candidates.push(
			<CAlert color="warning" role="alert">
				Failed to build list of modules:
				<br />
				{e?.toString()}
			</CAlert>
		)
	}

	const includeStoreModules = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault()
			typeFilter.toggleVisibility('available', true)
		},
		[typeFilter]
	)

	return (
		<>
			<AddConnectionModal ref={addRef} doConfigureConnection={doConfigureConnection} showHelp={showHelp} />
			<div style={{ clear: 'both' }} className="row-heading">
				<h4>Add connection</h4>
				{modules.storeList.size > 0 ? (
					<p>
						Companion currently supports over {modules.storeList.size} different things, and the list grows every day.
						If you can't find the device you're looking for, please{' '}
						<a target="_new" href="https://github.com/bitfocus/companion-module-requests">
							add a request
						</a>{' '}
						on GitHub
					</p>
				) : (
					<p>
						Companion currently hundreds of different things, and the list grows every day. If you have an active
						internet connection you can search for and install modules to support additional devices. Otherwise you can
						install download and load in a module bundle from the website.
						<a target="_new" href="https://user.bitfocus.io/download">
							the website
						</a>{' '}
					</p>
				)}

				<div className="refresh-and-last-updated">
					<RefreshModulesList />
					<LastUpdatedTimestamp timestamp={modules.storeUpdateInfo.lastUpdated} />
				</div>

				<div className="table-header-buttons">
					<VisibilityButton
						{...typeFilter}
						keyId="available"
						color="info"
						label="Available"
						title="Available to be installed from the store"
					/>
				</div>

				<SearchBox filter={filter} setFilter={setFilter} />
				<br />
			</div>
			<div id="connection_add_search_results">
				{candidates}

				{candidates.length === 0 && allProducts.length > 0 && (
					<NonIdealState icon={faPlug}>
						No modules match your search.
						<br />
						{!typeFilter.visibility.available && (
							<a href="#" onClick={includeStoreModules}>
								Click here to include modules from the store
							</a>
						)}
					</NonIdealState>
				)}

				{candidates.length === 0 && allProducts.length === 0 && (
					<NonIdealState icon={faPlug}>
						No modules are installed.
						<br />
						Make sure you have an active internet connection, or load a module bundle into the{' '}
						<Link to="/modules">Modules tab</Link>
					</NonIdealState>
				)}
			</div>
		</>
	)
})

interface AddConnectionEntryProps {
	moduleInfo: FuzzyProduct
	addConnection(module: FuzzyProduct): void
	showHelp(moduleId: string, moduleVersion: NewClientModuleVersionInfo2): void
}

function AddConnectionEntry({ moduleInfo, addConnection, showHelp }: AddConnectionEntryProps) {
	const addConnectionClick = useCallback(() => addConnection(moduleInfo), [addConnection, moduleInfo])
	const showVersion: NewClientModuleVersionInfo2 | undefined =
		moduleInfo.installedInfo?.stableVersion ??
		moduleInfo.installedInfo?.prereleaseVersion ??
		moduleInfo.installedInfo?.installedVersions?.[0]
	const showHelpClick = useCallback(
		() => showVersion && showHelp(moduleInfo.id, showVersion),
		[showHelp, moduleInfo.id, showVersion]
	)

	return (
		<div>
			<CButton color="primary" onClick={addConnectionClick}>
				Add
			</CButton>
			&nbsp;
			{moduleInfo.installedInfo?.stableVersion?.isLegacy && (
				<>
					<FontAwesomeIcon
						icon={faExclamationTriangle}
						color="#ff6600"
						size={'xl'}
						title="This module has not been updated for Companion 3.0, and may not work fully"
					/>
					&nbsp;
				</>
			)}
			{moduleInfo.name}
			{/* // TODO: align in columns? */}
			{!!moduleInfo.storeInfo && (
				<WindowLinkOpen className="float_right" title="Open Store Page" href={moduleInfo.storeInfo.storeUrl}>
					<FontAwesomeIcon icon={faExternalLink} />
				</WindowLinkOpen>
			)}
			{!!moduleInfo.storeInfo?.githubUrl && (
				<WindowLinkOpen className="float_right" title="Open GitHub Page" href={moduleInfo.storeInfo.githubUrl}>
					<FontAwesomeIcon icon={faGithub} />
				</WindowLinkOpen>
			)}
			{showVersion?.hasHelp && (
				<div className="float_right" onClick={showHelpClick}>
					<FontAwesomeIcon icon={faQuestionCircle} />
				</div>
			)}
		</div>
	)
}
