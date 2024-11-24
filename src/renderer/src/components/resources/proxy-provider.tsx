import {
  mihomoProxyProviders,
  mihomoUpdateProxyProviders,
  getRuntimeConfig
} from '@renderer/utils/ipc'
import { Fragment, useEffect, useMemo, useState } from 'react'
import Viewer from './viewer'
import useSWR from 'swr'
import SettingCard from '../base/base-setting-card'
import SettingItem from '../base/base-setting-item'
import { Button, Chip } from '@nextui-org/react'
import { IoMdRefresh } from 'react-icons/io'
import { CgLoadbarDoc } from 'react-icons/cg'
import { MdEditDocument } from 'react-icons/md'
import dayjs from 'dayjs'
import { calcTraffic } from '@renderer/utils/calc'
import { getHash } from '@renderer/utils/hash'

const ProxyProvider: React.FC = () => {
  const [showDetails, setShowDetails] = useState({
    show: false,
    path: '',
    type: '',
    title: ''
  })

  useEffect(() => {
    const fetchProviderPath = async (name: string): Promise<void> => {
      try {
        const providers = await getRuntimeConfig()
        const provider = providers['proxy-providers'][name]
        setShowDetails((prev) => ({
          ...prev,
          show: true,
          path: provider?.path || `proxies/${getHash(provider?.url)}`
        }))
      } catch {
        setShowDetails((prev) => ({ ...prev, path: '' }))
      }
    }
    if (showDetails.path) {
      fetchProviderPath(showDetails.path)
    }
  }, [showDetails.path])

  const { data, mutate } = useSWR('mihomoProxyProviders', mihomoProxyProviders)
  const providers = useMemo(() => {
    if (!data) return []
    if (!data.providers) return []
    return Object.keys(data.providers)
      .map((key) => data.providers[key])
      .filter((provider) => {
        return 'subscriptionInfo' in provider
      })
  }, [data])
  const [updating, setUpdating] = useState(Array(providers.length).fill(false))

  const onUpdate = async (name: string, index: number): Promise<void> => {
    setUpdating((prev) => {
      prev[index] = true
      return [...prev]
    })
    try {
      await mihomoUpdateProxyProviders(name)
      mutate()
    } catch (e) {
      alert(e)
    } finally {
      setUpdating((prev) => {
        prev[index] = false
        return [...prev]
      })
    }
  }

  if (!providers.length) {
    return null
  }

  return (
    <SettingCard>
      {showDetails.show && (
        <Viewer
          path={showDetails.path}
          type={showDetails.type}
          title={showDetails.title}
          onClose={() => setShowDetails({ show: false, path: '', type: '', title: '' })}
        />
      )}
      <SettingItem title="代理集合" divider>
        <Button
          size="sm"
          color="primary"
          onPress={() => {
            providers.forEach((provider, index) => {
              onUpdate(provider.name, index)
            })
          }}
        >
          更新全部
        </Button>
      </SettingItem>
      {providers.map((provider, index) => (
        <Fragment key={provider.name}>
          <SettingItem
            title={provider.name}
            actions={
              <Chip className="ml-2" size="sm">
                {provider.proxies?.length || 0}
              </Chip>
            }
            divider={!provider.subscriptionInfo && index !== providers.length - 1}
          >
            <div className="flex h-[32px] leading-[32px] text-foreground-500">
              <div>{dayjs(provider.updatedAt).fromNow()}</div>
              {/* <Button isIconOnly className="ml-2" size="sm">
                <IoMdEye className="text-lg" />
              </Button> */}
              <Button
                isIconOnly
                title={provider.vehicleType == 'File' ? '编辑' : '查看'}
                className="ml-2"
                size="sm"
                onPress={() => {
                  setShowDetails({
                    show: false,
                    path: provider.name,
                    type: provider.vehicleType,
                    title: provider.name
                  })
                }}
              >
                {provider.vehicleType == 'File' ? (
                  <MdEditDocument className={`text-lg`} />
                ) : (
                  <CgLoadbarDoc className={`text-lg`} />
                )}
              </Button>
              <Button
                isIconOnly
                title="更新"
                className="ml-2"
                size="sm"
                onPress={() => {
                  onUpdate(provider.name, index)
                }}
              >
                <IoMdRefresh className={`text-lg ${updating[index] ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </SettingItem>
          {provider.subscriptionInfo && (
            <SettingItem
              divider={index !== providers.length - 1}
              title={
                <div className="text-foreground-500">
                  {`${calcTraffic(
                    provider.subscriptionInfo.Upload + provider.subscriptionInfo.Download
                  )} / ${calcTraffic(provider.subscriptionInfo.Total)}`}
                </div>
              }
            >
              <div className="h-[32px] leading-[32px] text-foreground-500">
                {provider.subscriptionInfo.Expire
                  ? dayjs.unix(provider.subscriptionInfo.Expire).format('YYYY-MM-DD')
                  : '长期有效'}
              </div>
            </SettingItem>
          )}
        </Fragment>
      ))}
    </SettingCard>
  )
}

export default ProxyProvider
