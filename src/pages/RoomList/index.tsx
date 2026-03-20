import { getSpyRoom } from '@/apis';
import { LoadingFallback } from '@/components/LoadingFallback';
import { debug } from '@/utils/debug';
import {
  AllBrowserTypes,
  AllMPTypes,
  ClientRoomInfo,
  OS_CONFIG,
  getBrowserLogo,
  getBrowserName,
  parseUserAgent,
} from '@/utils/brand';
import { ClearOutlined, LinkOutlined, SearchOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
  Button,
  Collapse,
  Empty,
  Form,
  Input,
  Layout,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  Row,
  Col,
} from 'antd';
import type { CollapseProps, TableProps } from 'antd';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { DebugButton } from './DebugButton';
import { Statistics } from './Statistics';
import './index.less';
import {
  getRoomDisplayTitle,
  getRoomEnv,
  getRoomUniqueDisplay,
  getRoomUrl,
  getRoomUrlDisplay,
  getRoomVersion,
  getShortAddress,
  groupRoomsByUnique,
  hasRoomClient,
  matchesRoomKeyword,
  normalizeSearchValue,
  ROOM_ENV_OPTIONS,
  safeDecodeURI,
} from './utils';

const { Title } = Typography;
const { Option } = Select;
const { Sider, Content } = Layout;

const MAXIMUM_CONNECTIONS = 30;
const DEFAULT_CONDITIONS = {
  keyword: '',
  env: '',
  version: '',
  os: '',
  browser: '',
};

const sortConnections = (data: ClientRoomInfo[]) => {
  const [valid, invalid] = (data || []).reduce(
    (acc, cur) => {
      if (hasRoomClient(cur)) acc[0].push(cur);
      else acc[1].push(cur);
      return acc;
    },
    [[], []] as [ClientRoomInfo[], ClientRoomInfo[]],
  );

  const ascWithCreatedAtForValid = valid.sort((a, b) => {
    if (a.createdAt < b.createdAt) {
      return -1;
    }
    return 1;
  });

  const descWithActiveAtForInvalid = invalid.sort((a, b) => {
    if (a.activeAt > b.activeAt) {
      return -1;
    }
    return 1;
  });

  return [...ascWithCreatedAtForValid, ...descWithActiveAtForInvalid];
};

const filterConnections = (
  data: ClientRoomInfo[],
  condition: typeof DEFAULT_CONDITIONS,
) => {
  const {
    keyword = '',
    env = '',
    version = '',
    os = '',
    browser = '',
  } = condition;
  const normalizedVersion = normalizeSearchValue(version);
  return data
    .filter((room) => {
      return matchesRoomKeyword(room, keyword);
    })
    .filter((room) => {
      return !env || getRoomEnv(room) === env;
    })
    .filter((room) => {
      return (
        !normalizedVersion ||
        normalizeSearchValue(getRoomVersion(room)).includes(normalizedVersion)
      );
    })
    .filter((clientInfo) => {
      return (
        (!os || clientInfo.os.type === os) &&
        (!browser || clientInfo.browser.type === browser)
      );
    });
};

const renderTruncatedText = (
  value: string,
  className: string,
  tooltipValue?: string,
) => {
  const content = value || '--';
  const tooltip = tooltipValue ?? (value || undefined);

  return (
    <Tooltip title={tooltip}>
      <div className={className}>{content}</div>
    </Tooltip>
  );
};

const getBrandTooltipTitle = ({
  label,
  name,
  value,
}: {
  label?: string;
  name?: string;
  value?: string;
}) => {
  return [label || name, value].filter(Boolean).join(' ');
};

interface RoomHeaderBrand {
  logo?: string;
  fallbackLogo?: string;
  name: string;
  value?: string;
}

const getRoomHeaderBrand = (room: ClientRoomInfo) => {
  const roomLogo = String(room.tags?.roomLogo ?? room.tags?.logo ?? '').trim();
  const fallbackBrand =
    room.browser.type !== 'unknown' ? room.browser : room.os;

  if (roomLogo) {
    return {
      logo: roomLogo,
      fallbackLogo: fallbackBrand.logo,
      name: getRoomDisplayTitle(room),
    } satisfies RoomHeaderBrand;
  }

  if (room.browser.type !== 'unknown') {
    return room.browser;
  }

  return room.os;
};

const handleRoomBrandImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const fallbackLogo = event.currentTarget.dataset.fallbackLogo;

  if (
    fallbackLogo &&
    event.currentTarget.getAttribute('src') !== fallbackLogo
  ) {
    event.currentTarget.setAttribute('src', fallbackLogo);
    event.currentTarget.dataset.fallbackLogo = '';
    return;
  }

  event.currentTarget.style.visibility = 'hidden';
};

const RoomList = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();

  const showLoadingRef = useRef(false);
  const [activeGroupKey, setActiveGroupKey] = useState<string>();
  const {
    loading,
    data: connectionList = [],
    error,
  } = useRequest(
    async () => {
      const res = await getSpyRoom();
      return res.data?.map((conn) => {
        const { os, browser } = parseUserAgent(conn.name);
        return {
          ...conn,
          os,
          browser,
        };
      });
    },
    {
      pollingInterval: 5000,
      pollingWhenHidden: false,
      pollingErrorRetryCount: 0,
      onError(e) {
        message.error(e.message);
      },
      onFinally() {
        showLoadingRef.current = true;
      },
    },
  );

  const browserOptions = useMemo(() => {
    return AllBrowserTypes.filter((browser) => {
      return connectionList?.some(
        (conn) => conn.browser.type.toLocaleLowerCase() === browser,
      );
    }).map((name) => {
      return {
        name,
        label: getBrowserName(name),
        logo: getBrowserLogo(name),
      };
    });
  }, [connectionList]);

  const mpTypeOptions = useMemo(() => {
    return AllMPTypes.filter((mp) => {
      return connectionList?.some((conn) => conn.browser.type === mp);
    }).map((name) => {
      return {
        name,
        label: getBrowserName(name),
        logo: getBrowserLogo(name),
      };
    });
  }, [connectionList]);

  const [conditions, setConditions] = useState(DEFAULT_CONDITIONS);

  const onFormFinish = useCallback(
    (value: Partial<typeof DEFAULT_CONDITIONS>) => {
      setConditions({
        ...DEFAULT_CONDITIONS,
        ...value,
      });
    },
    [],
  );

  const matchedConnections = useMemo(() => {
    return filterConnections(connectionList, conditions);
  }, [conditions, connectionList]);

  const showMaximumAlert = matchedConnections.length > MAXIMUM_CONNECTIONS;

  const groupedConnections = useMemo(() => {
    const list = sortConnections(
      matchedConnections.slice(0, MAXIMUM_CONNECTIONS),
    );
    return groupRoomsByUnique(list);
  }, [matchedConnections]);

  useEffect(() => {
    if (!groupedConnections.length) {
      setActiveGroupKey(undefined);
      return;
    }

    const hasCurrent = groupedConnections.some(
      (group) => group.key === activeGroupKey,
    );
    if (!activeGroupKey || !hasCurrent) {
      setActiveGroupKey(groupedConnections[0].key);
    }
  }, [activeGroupKey, groupedConnections]);

  const tableColumns = useMemo<
    NonNullable<TableProps<ClientRoomInfo>['columns']>
  >(
    () => [
      {
        title: t('common.title'),
        key: 'title',
        width: 220,
        render: (_, room) => {
          const title = getRoomDisplayTitle(room);
          const project = safeDecodeURI(room.group) || '--';

          return (
            <div className="room-table-primary">
              {renderTruncatedText(title, 'room-table-primary__title', title)}
              {renderTruncatedText(
                project,
                'room-table-primary__subtitle',
                project,
              )}
            </div>
          );
        },
      },
      {
        title: 'URL',
        key: 'url',
        width: 250,
        render: (_, room) => {
          const url = getRoomUrl(room);
          const urlDisplay = getRoomUrlDisplay(room);

          if (!url) {
            return <span className="room-table-placeholder">--</span>;
          }

          return (
            <Tooltip title={url}>
              <div className="room-table-link">
                <LinkOutlined />
                <span>{urlDisplay}</span>
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: t('devtool.platform'),
        key: 'platform',
        width: 96,
        render: (_, room) => {
          const entries = [
            {
              key: 'os',
              logo: room.os.logo,
              label: room.os.name,
              value: room.os.version,
            },
            {
              key: 'browser',
              logo: room.browser.logo,
              label: room.browser.name,
              value: room.browser.version,
            },
          ];

          return (
            <div className="room-table-platforms">
              {entries.map((entry) => (
                <Tooltip key={entry.key} title={getBrandTooltipTitle(entry)}>
                  <div
                    className="room-table-platform"
                    aria-label={getBrandTooltipTitle(entry)}
                  >
                    {entry.logo ? (
                      <img src={entry.logo} alt={entry.label} />
                    ) : null}
                  </div>
                </Tooltip>
              ))}
            </div>
          );
        },
      },
      {
        title: t('connections.environment'),
        key: 'meta',
        width: 130,
        render: (_, room) => {
          const env = getRoomEnv(room);
          const version = getRoomVersion(room);

          return (
            <div className="room-table-meta">
              {env ? (
                <Tag color="blue" className="room-table-meta__tag">
                  {env.toUpperCase()}
                </Tag>
              ) : (
                <span className="room-table-placeholder">--</span>
              )}
              <span className="room-table-meta__version">
                {version ? `v${version}` : '--'}
              </span>
            </div>
          );
        },
      },
      {
        title: t('common.room-id'),
        key: 'address',
        width: 90,
        render: (_, room) => {
          return (
            <Tooltip title={room.address}>
              <code className="room-table-code">
                {getShortAddress(room.address)}
              </code>
            </Tooltip>
          );
        },
      },
      {
        title: t('common.status'),
        key: 'status',
        width: 100,
        render: (_, room) => {
          const isActive = hasRoomClient(room);
          return (
            <Tag
              className={`room-status-tag ${
                isActive ? 'is-active' : 'is-pending'
              }`}
            >
              {isActive
                ? t('connections.status.active')
                : t('connections.status.wait')}
            </Tag>
          );
        },
      },
      {
        title: t('common.actions'),
        key: 'actions',
        width: 96,
        align: 'center',
        render: (_, room) => {
          return <DebugButton room={room} compact />;
        },
      },
    ],
    [t],
  );

  const collapseItems = useMemo<CollapseProps['items']>(() => {
    return groupedConnections.map((group) => {
      const primaryRoom = group.primaryRoom;
      const unique = getRoomUniqueDisplay(primaryRoom);
      const primaryText = group.hasUnique
        ? unique
        : getRoomDisplayTitle(primaryRoom);
      const project = safeDecodeURI(primaryRoom.group) || '--';
      const titleBrand = getRoomHeaderBrand(primaryRoom);

      return {
        key: group.key,
        label: (
          <div className="room-group-header">
            <div className="room-group-header__main">
              <div className="room-group-header__title-row">
                <Tooltip title={getBrandTooltipTitle(titleBrand)}>
                  <span className="room-group-header__logo">
                    <img
                      src={titleBrand.logo}
                      alt={titleBrand.name}
                      data-fallback-logo={titleBrand.fallbackLogo}
                      onError={handleRoomBrandImageError}
                    />
                  </span>
                </Tooltip>
                {renderTruncatedText(
                  primaryText,
                  'room-group-header__title',
                  primaryText,
                )}
              </div>
            </div>
            <div className="room-group-header__chips">
              <span className="room-group-header__chip">
                {t('common.project')} · {project}
              </span>
              <span className="room-group-header__chip">
                {t('common.unique')} · {group.hasUnique ? unique : '--'}
              </span>
              <span className="room-group-header__chip">
                {group.rooms.length} {t('common.connections')}
              </span>
              <span
                className={`room-group-header__chip ${
                  group.liveCount ? 'is-active' : ''
                }`}
              >
                {group.liveCount} {t('connections.status.active')}
              </span>
            </div>
          </div>
        ),
        children: (
          <Table<ClientRoomInfo>
            rowKey="address"
            className="room-list-table"
            columns={tableColumns}
            dataSource={group.rooms}
            pagination={false}
            size="middle"
            tableLayout="fixed"
            scroll={{ x: 960 }}
          />
        ),
      };
    });
  }, [groupedConnections, t, tableColumns]);

  const mainContent = useMemo(() => {
    if (loading && !showLoadingRef.current) {
      return <LoadingFallback />;
    }

    if (error || matchedConnections.length === 0) {
      return (
        <Empty
          style={{
            marginTop: 60,
          }}
        />
      );
    }

    return (
      <div className="room-list-content">
        <Collapse
          accordion
          activeKey={activeGroupKey}
          className="room-list-groups"
          items={collapseItems}
          onChange={(key) => {
            setActiveGroupKey(Array.isArray(key) ? key[0] : key);
          }}
        />
      </div>
    );
  }, [
    activeGroupKey,
    collapseItems,
    error,
    loading,
    matchedConnections.length,
  ]);

  return (
    <Layout style={{ height: '100%' }} className="room-list">
      <Sider width={350} theme="light">
        <div className="room-list-sider">
          <Title level={3} style={{ marginBottom: 32 }}>
            {t('common.connections')}
          </Title>
          <Form layout="vertical" form={form} onFinish={onFormFinish}>
            <Form.Item label={t('connections.search-room')} name="keyword">
              <Input placeholder={t('connections.search-room')!} allowClear />
            </Form.Item>
            <Form.Item label={t('connections.environment')} name="env">
              <Select placeholder={t('connections.select-env')} allowClear>
                {ROOM_ENV_OPTIONS.map((env) => {
                  return (
                    <Option key={env} value={env}>
                      {env.toUpperCase()}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Form.Item label={t('devtool.version')} name="version">
              <Input placeholder={t('devtool.version')!} allowClear />
            </Form.Item>
            <Form.Item label={t('common.os')} name="os">
              <Select placeholder={t('connections.select-os')} allowClear>
                {Object.entries(OS_CONFIG).map(([name, conf]) => {
                  return (
                    <Option value={name} key={name}>
                      <div className="flex-between">
                        <span>{conf.label}</span>
                        <img src={conf.logo} height="20" alt="" />
                      </div>
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Form.Item label={t('devtool.platform')} name="browser">
              <Select
                listHeight={500}
                placeholder={t('connections.select-platform')}
                allowClear
              >
                {!!browserOptions.length && (
                  <Select.OptGroup label="Web" key="web">
                    {browserOptions.map(({ name, logo, label }) => {
                      return (
                        <Option key={name} value={name}>
                          <div className="flex-between">
                            <span>{label}</span>
                            <img src={logo} width="20" height="20" alt="" />
                          </div>
                        </Option>
                      );
                    })}
                  </Select.OptGroup>
                )}

                {!!mpTypeOptions.length && (
                  <Select.OptGroup
                    label={t('common.miniprogram')}
                    key="miniprogram"
                  >
                    {mpTypeOptions.map(({ name, logo, label }) => {
                      return (
                        <Option key={name} value={name}>
                          <div className="flex-between">
                            <span>{label}</span>
                            <img src={logo} width="20" height="20" alt="" />
                          </div>
                        </Option>
                      );
                    })}
                  </Select.OptGroup>
                )}
              </Select>
            </Form.Item>
            <Row justify="end">
              <Col>
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SearchOutlined />}
                    >
                      {t('common.search')}
                    </Button>
                    <Button
                      type="default"
                      icon={<ClearOutlined />}
                      onClick={() => {
                        form.resetFields();
                        form.submit();
                      }}
                    >
                      {t('common.reset')}
                    </Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>

            {showMaximumAlert && (
              <div className="maximum-alert">
                {t('connections.maximum-alert')}
              </div>
            )}
          </Form>
          {debug.enabled && <Statistics data={connectionList} />}
        </div>
      </Sider>
      <Content>{mainContent}</Content>
    </Layout>
  );
};

export default RoomList;
