import { parseUserAgent } from '@/utils/brand';
import { Col, Tooltip, Row } from 'antd';
import clsx from 'clsx';
import { DebugButton } from '../DebugButton';
import { PropsWithChildren, memo } from 'react';
import {
  getRoomEnv,
  getRoomVersion,
  getShortAddress,
  safeDecodeURI,
} from '../utils';

interface Props {
  room: I.SpyRoom;
}

const ConnDetailItem = ({
  title,
  children,
}: PropsWithChildren<{ title: string }>) => {
  return (
    <div className="conn-detail">
      <p className="conn-detail__title">{title}</p>
      <div className="conn-detail__value">{children}</div>
    </div>
  );
};

export const RoomCard = memo(
  ({ room }: Props) => {
    const { address, name, group, tags } = room;
    const decodeGroup = safeDecodeURI(group);
    const simpleAddress = getShortAddress(address);
    const env = getRoomEnv(room);
    const version = getRoomVersion(room);
    const { os, browser } = parseUserAgent(name);

    return (
      <Col key={address} span={8} xl={6} xxl={4}>
        <div className={clsx('connection-item')}>
          <div className="connection-item__title">
            <code style={{ fontSize: 36 }}>
              <b>{simpleAddress}</b>
            </code>
            <Tooltip
              title={`Title: ${tags.title?.toString() || '--'}`}
              placement="right"
            >
              <div className="custom-title">
                {tags.title?.toString() || '--'}
              </div>
            </Tooltip>
          </div>
          <Row wrap={false} style={{ marginBlock: 8 }}>
            <Col flex={1}>
              <ConnDetailItem title="Project">
                <Tooltip title={decodeGroup}>
                  <p style={{ fontSize: 16 }}>{decodeGroup}</p>
                </Tooltip>
              </ConnDetailItem>
            </Col>
            <Col flex={1}>
              <ConnDetailItem title="OS">
                <Tooltip title={`${os.name} ${os.version}`}>
                  <img src={os.logo} alt="os logo" />
                </Tooltip>
              </ConnDetailItem>
            </Col>
            <Col flex={1}>
              <ConnDetailItem title="Platform">
                <Tooltip title={`${browser.name} ${browser.version}`}>
                  <img src={browser.logo} alt="browser logo" />
                </Tooltip>
              </ConnDetailItem>
            </Col>
          </Row>
          <Row wrap={false} style={{ marginBottom: 12 }}>
            <Col flex={1}>
              <ConnDetailItem title="Env">
                <p style={{ fontSize: 16 }}>{env ? env.toUpperCase() : '--'}</p>
              </ConnDetailItem>
            </Col>
            <Col flex={2}>
              <ConnDetailItem title="Version">
                <Tooltip title={version || '--'}>
                  <p style={{ fontSize: 14 }}>{version || '--'}</p>
                </Tooltip>
              </ConnDetailItem>
            </Col>
          </Row>
          <DebugButton room={room} />
        </div>
      </Col>
    );
  },
  ({ room: old }, { room: now }) => {
    if (
      old.name !== now.name ||
      old.group !== now.group ||
      old.address !== now.address ||
      old.tags.title !== now.tags.title ||
      old.tags.env !== now.tags.env ||
      old.tags.version !== now.tags.version ||
      old.connections.length !== now.connections.length
    )
      return false;
    return true;
  },
);
