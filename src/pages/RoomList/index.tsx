import { getSpyRoom } from '@/apis';
import {
  AllBrowserTypes,
  AllMPTypes,
  ClientRoomInfo,
  OS_CONFIG,
  getBrowserLogo,
  getBrowserName,
  parseUserAgent,
} from '@/utils/brand';
import { useRequest } from 'ahooks';
import {
  Typography,
  Row,
  Col,
  message,
  Empty,
  Button,
  Input,
  Form,
  Select,
  Space,
  Layout,
} from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './index.less';
import { ClearOutlined, SearchOutlined } from '@ant-design/icons';
import { RoomCard } from './RoomCard';
import { Statistics } from './Statistics';
import { LoadingFallback } from '@/components/LoadingFallback';
import { debug } from '@/utils/debug';
import {
  getRoomEnv,
  getRoomVersion,
  matchesRoomKeyword,
  normalizeSearchValue,
  ROOM_ENV_OPTIONS,
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
      const hasClient =
        cur.connections.findIndex((i) => i.userId === 'Client') > -1;
      if (hasClient) acc[0].push(cur);
      else acc[1].push(cur);
      return acc;
    },
    [[], []] as I.SpyRoom[][],
  );

  // 有效房间再按创建时间升序
  const ascWithCreatedAtForInvalid = valid.sort((a, b) => {
    if (a.createdAt < b.createdAt) {
      return -1;
    }
    return 1;
  });
  // 失效房间再按活动时间降序
  const ascWithActiveAtForInvalid = invalid.sort((a, b) => {
    if (a.activeAt > b.activeAt) {
      return -1;
    }
    return 1;
  });

  return [...ascWithCreatedAtForInvalid, ...ascWithActiveAtForInvalid];
};

const filterConnections = (
  data: ClientRoomInfo[],
  condition: Record<'keyword' | 'env' | 'version' | 'os' | 'browser', string>,
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

const RoomList = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();

  const showLoadingRef = useRef(false);
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

  const BrowserOptions = useMemo(() => {
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

  const MPTypeOptions = useMemo(() => {
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

  const onFormFinish = useCallback((value: any) => {
    setConditions({
      ...DEFAULT_CONDITIONS,
      ...value,
    });
  }, []);

  const matchedConnections = useMemo(() => {
    return filterConnections(connectionList, conditions);
  }, [conditions, connectionList]);

  const showMaximumAlert = matchedConnections.length > MAXIMUM_CONNECTIONS;

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
    const list = sortConnections(
      matchedConnections.slice(0, MAXIMUM_CONNECTIONS),
    );

    return (
      <Row gutter={24} style={{ padding: 24 }}>
        {list.map((room) => (
          <RoomCard key={room.address} room={room} />
        ))}
      </Row>
    );
  }, [error, loading, matchedConnections]);

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
                {!!BrowserOptions.length && (
                  <Select.OptGroup label="Web" key="web">
                    {BrowserOptions.map(({ name, logo, label }) => {
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

                {!!MPTypeOptions.length && (
                  <Select.OptGroup
                    label={t('common.miniprogram')}
                    key="miniprogram"
                  >
                    {MPTypeOptions.map(({ name, logo, label }) => {
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
