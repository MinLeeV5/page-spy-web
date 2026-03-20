import { parseUserAgent } from '@/utils/brand';
import { LinkOutlined } from '@ant-design/icons';
import { Col, Tooltip } from 'antd';
import clsx from 'clsx';
import { DebugButton } from '../DebugButton';
import { memo } from 'react';
import {
  getRoomEnv,
  getRoomTitle,
  getRoomUrl,
  getRoomUrlDisplay,
  getRoomVersion,
  getShortAddress,
  safeDecodeURI,
} from '../utils';

interface Props {
  room: I.SpyRoom;
}

export const RoomCard = memo(
  ({ room }: Props) => {
    const { address, name, group } = room;
    const decodeGroup = safeDecodeURI(group);
    const simpleAddress = getShortAddress(address);
    const title = getRoomTitle(room);
    const displayTitle = title || decodeGroup || '--';
    const roomUrl = getRoomUrl(room);
    const roomUrlDisplay = getRoomUrlDisplay(room);
    const env = getRoomEnv(room);
    const version = getRoomVersion(room);
    const hasClient = room.connections.some(
      ({ userId }) => userId === 'Client',
    );
    const { os, browser } = parseUserAgent(name);
    const metadata = [
      env ? { label: env.toUpperCase(), className: 'is-env' } : null,
      version ? { label: `v${version}`, className: '' } : null,
    ].filter(Boolean) as { label: string; className: string }[];
    const projectLabel =
      decodeGroup && decodeGroup !== displayTitle ? decodeGroup : '';

    return (
      <Col key={address} xs={24} sm={12} lg={8} xl={6} xxl={4}>
        <div className={clsx('connection-item')}>
          <div className="connection-item__hero">
            <div className="connection-item__eyebrow">
              <span
                className={clsx('connection-item__status', {
                  'is-online': hasClient,
                  'is-offline': !hasClient,
                })}
              >
                {hasClient ? 'Live' : 'Offline'}
              </span>
              <Tooltip title={address}>
                <code className="connection-item__id">ID {simpleAddress}</code>
              </Tooltip>
            </div>
            <Tooltip title={title || displayTitle} placement="topLeft">
              <div className="connection-item__main-title">{displayTitle}</div>
            </Tooltip>
            {projectLabel ? (
              <Tooltip title={decodeGroup} placement="topLeft">
                <div className="connection-item__project">{projectLabel}</div>
              </Tooltip>
            ) : null}
            {roomUrl ? (
              <Tooltip title={roomUrl} placement="topLeft">
                <div className="connection-item__url">
                  <LinkOutlined />
                  <span>{roomUrlDisplay}</span>
                </div>
              </Tooltip>
            ) : null}
          </div>
          {metadata.length ? (
            <div className="connection-item__chips">
              {metadata.map((item) => {
                return (
                  <span
                    key={item.label}
                    className={clsx('connection-item__chip', item.className)}
                  >
                    {item.label}
                  </span>
                );
              })}
            </div>
          ) : null}
          <div className="connection-item__footer">
            <div className="connection-item__platforms">
              <Tooltip title={`${os.name} ${os.version}`}>
                <div className="connection-item__platform">
                  <img src={os.logo} alt="os logo" />
                  <span>{os.name}</span>
                </div>
              </Tooltip>
              <Tooltip title={`${browser.name} ${browser.version}`}>
                <div className="connection-item__platform">
                  <img src={browser.logo} alt="browser logo" />
                  <span>{browser.name}</span>
                </div>
              </Tooltip>
            </div>
            <DebugButton room={room} />
          </div>
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
      old.tags.url !== now.tags.url ||
      old.tags.env !== now.tags.env ||
      old.tags.version !== now.tags.version ||
      old.connections.length !== now.connections.length
    )
      return false;
    return true;
  },
);
