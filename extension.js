/**
 * extension.js — PortKiller GNOME Shell Extension
 * Main extension file. Creates a top-bar indicator with a popup menu
 * listing all active listening ports and providing kill functionality.
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { getOpenPorts, killProcess, killAllPorts } from './portHelper.js';

// ─── Indicator Widget ───────────────────────────────────────────────────────

const PortKillerIndicator = GObject.registerClass(
class PortKillerIndicator extends PanelMenu.Button {

    _init(extension) {
        super._init(0.0, 'PortKiller');
        this._extension = extension;
        this._ports = [];
        this._processGroups = [];
        this._showSystemPorts = false;
        this._refreshTimeout = null;
        this._killAllConfirmTimeout = null;
        this._killAllArmed = false;

        this._settings = this._extension.getSettings();
        this._settings.connect('changed::badge-display-mode', () => this._updateBadge());
        this._settings.connect('changed::port-view-mode', () => {
            this._updateViewModeButtonIcon();
            this._renderPorts();
        });

        // ── Top-bar icon + label ──────────────────────────────────────────
        const box = new St.BoxLayout({
            style_class: 'portkiller-indicator',
            vertical: false,
        });

        this._icon = new St.Icon({
            icon_name: 'network-wired-symbolic',
            style_class: 'system-status-icon portkiller-icon',
        });

        this._badge = new St.Label({
            text: '…',
            style_class: 'portkiller-badge',
            y_align: Clutter.ActorAlign.CENTER,
        });

        box.add_child(this._icon);
        box.add_child(this._badge);
        this.add_child(box);

        // ── Build static menu skeleton ────────────────────────────────────
        this._buildMenu();

        // Refresh on open
        this.menu.connect('open-state-changed', (menu, isOpen) => {
            if (isOpen) this._refresh();
        });

        // Initial badge update after a short delay
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            this._refresh();
            return GLib.SOURCE_REMOVE;
        });
    }

    // ── Menu skeleton ──────────────────────────────────────────────────────

    _buildMenu() {
        // Header row
        const headerItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'portkiller-header-item',
        });

        const headerBox = new St.BoxLayout({
            style_class: 'portkiller-header',
            x_expand: true,
        });

        const headerIcon = new St.Icon({
            icon_name: 'network-wired-symbolic',
            icon_size: 16,
            style_class: 'portkiller-header-icon',
        });

        const headerLabel = new St.Label({
            text: 'PortKiller',
            style_class: 'portkiller-header-label',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._filterBtn = new St.Button({
            child: new St.Icon({
                icon_name: 'view-reveal-symbolic',
                icon_size: 14,
            }),
            style_class: 'portkiller-icon-btn',
            x_align: Clutter.ActorAlign.END,
        });
        this._filterBtn.connect('clicked', () => {
            this._showSystemPorts = !this._showSystemPorts;
            this._filterBtn.child.icon_name = this._showSystemPorts ? 'view-conceal-symbolic' : 'view-reveal-symbolic';
            this._refresh();
        });

        this._viewModeBtn = new St.Button({
            child: new St.Icon({
                icon_name: 'view-list-symbolic',
                icon_size: 14,
            }),
            style_class: 'portkiller-icon-btn',
            x_align: Clutter.ActorAlign.END,
        });
        this._viewModeBtn.connect('clicked', () => {
            const currentMode = this._settings.get_int('port-view-mode');
            const nextMode = currentMode === 1 ? 0 : 1;
            this._settings.set_int('port-view-mode', nextMode);
            this._updateViewModeButtonIcon();
            this._renderPorts();
        });

        this._refreshBtn = new St.Button({
            child: new St.Icon({
                icon_name: 'view-refresh-symbolic',
                icon_size: 14,
            }),
            style_class: 'portkiller-icon-btn',
            x_align: Clutter.ActorAlign.END,
        });
        this._refreshBtn.connect('clicked', () => this._refresh());

        headerBox.add_child(headerIcon);
        headerBox.add_child(headerLabel);
        headerBox.add_child(this._filterBtn);
        headerBox.add_child(this._viewModeBtn);
        headerBox.add_child(this._refreshBtn);
        headerItem.add_child(headerBox);
        this.menu.addMenuItem(headerItem);
        this._updateViewModeButtonIcon();

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Scrollable section for port rows
        this._section = new PopupMenu.PopupMenuSection();
        const scrollView = new St.ScrollView({
            style_class: 'portkiller-scroll',
            overlay_scrollbars: true,
            x_expand: true,
        });
        scrollView.set_child(this._section.actor);
        const scrollItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        scrollItem.add_child(scrollView);
        this.menu.addMenuItem(scrollItem);

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Kill All button
        this._killAllItem = new PopupMenu.PopupBaseMenuItem({
            style_class: 'portkiller-killall-item',
        });
        const killAllBox = new St.BoxLayout({ x_expand: true });
        const killAllIcon = new St.Icon({
            icon_name: 'process-stop-symbolic',
            icon_size: 14,
            style_class: 'portkiller-killall-icon',
        });
        const killAllLabel = new St.Label({
            text: 'Kill All Ports',
            style_class: 'portkiller-killall-label',
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        this._killAllLabel = killAllLabel;
        killAllBox.add_child(killAllIcon);
        killAllBox.add_child(killAllLabel);
        this._killAllItem.add_child(killAllBox);
        this._killAllItem.connect('activate', () => {
            this._killAll();
        });
        this.menu.addMenuItem(this._killAllItem);
    }

    // ── Refresh port list ──────────────────────────────────────────────────

    _refresh() {
        // Animate refresh icon
        this._refreshBtn.add_style_class_name('spinning');
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
            this._refreshBtn.remove_style_class_name('spinning');
            return GLib.SOURCE_REMOVE;
        });

        const SYSTEM_PORTS = new Set([22, 53, 68, 111, 123, 137, 138, 139, 445, 631, 2049, 5353]);
        let allPorts = getOpenPorts();

        if (this._showSystemPorts) {
            this._ports = allPorts;
        } else {
            this._ports = allPorts.filter(p => !SYSTEM_PORTS.has(p.port) && p.processName !== 'unknown');
        }

        this._processGroups = this._buildProcessGroups(this._ports);
        this._renderPorts();
        this._updateBadge();
    }

    _updateBadge() {
        try {
            const count = this._ports.length;
            const mode = this._settings.get_int('badge-display-mode');

            this._badge.remove_style_class_name('portkiller-badge-zero');
            this._badge.remove_style_class_name('portkiller-badge-active');
            this._badge.remove_style_class_name('portkiller-badge-dot');
            this._badge.remove_style_class_name('portkiller-badge-hidden');

            if (mode === 2) {
                // Show nothing
                this._badge.set_text('');
                this._badge.add_style_class_name('portkiller-badge-hidden');
            } else if (mode === 1) {
                // Show dot if active
                this._badge.set_text('');
                if (count > 0) {
                    this._badge.add_style_class_name('portkiller-badge-dot');
                } else {
                    this._badge.add_style_class_name('portkiller-badge-hidden');
                }
            } else {
                // Show quantity (mode 0)
                this._badge.set_text(String(count));
                if (count === 0) {
                    this._badge.add_style_class_name('portkiller-badge-zero');
                } else {
                    this._badge.add_style_class_name('portkiller-badge-active');
                }
            }
        } catch (e) {
            logError(e, 'PortKiller: _updateBadge');
        }
    }

    _updateViewModeButtonIcon() {
        const mode = this._settings.get_int('port-view-mode');
        this._viewModeBtn.child.icon_name = mode === 1
            ? 'view-grid-symbolic'
            : 'view-list-symbolic';
    }

    _renderPorts() {
        // Clear existing port rows
        this._section.removeAll();
        this._disarmKillAll();

        if (this._ports.length === 0) {
            const emptyItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false,
                style_class: 'portkiller-empty-item',
            });
            const emptyLabel = new St.Label({
                text: 'No open ports found',
                style_class: 'portkiller-empty-label',
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });
            emptyItem.add_child(emptyLabel);
            this._section.addMenuItem(emptyItem);

            // Disable kill all
            this._killAllItem.reactive = false;
            this._killAllItem.add_style_class_name('portkiller-killall-disabled');
            return;
        }

        // Re-enable kill all
        this._killAllItem.reactive = true;
        this._killAllItem.remove_style_class_name('portkiller-killall-disabled');

        const viewMode = this._settings.get_int('port-view-mode');
        if (viewMode === 1) {
            this._renderGroupedByProcess();
            return;
        }

        for (const portInfo of this._ports) {
            this._addPortRow(portInfo);
        }
    }

    _buildProcessGroups(ports) {
        const groups = new Map();
        for (const info of ports) {
            const key = info.processName || 'unknown';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(info);
        }

        const result = [];
        for (const [processName, processPorts] of groups.entries()) {
            processPorts.sort((a, b) => a.port - b.port);
            result.push({ processName, ports: processPorts });
        }
        result.sort((a, b) => a.processName.localeCompare(b.processName));
        return result;
    }

    _renderGroupedByProcess() {
        for (const group of this._processGroups) {
            this._addProcessGroup(group.processName, group.ports);
        }
    }

    _addProcessGroup(processName, ports) {
        const groupItem = new PopupMenu.PopupSubMenuMenuItem('');
        groupItem.add_style_class_name('portkiller-process-submenu');
        groupItem.menu?.actor?.add_style_class_name('portkiller-process-submenu-box');
        groupItem.menu?.box?.add_style_class_name('portkiller-process-submenu-box');

        // Replace default label with colored parts (theme ignores Pango markup on many labels).
        groupItem.remove_child(groupItem.label);
        groupItem.label.destroy();

        const headerRow = new St.BoxLayout({
            style_class: 'portkiller-process-header-row-inline',
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        const dotLabel = new St.Label({
            text: '●',
            style_class: 'portkiller-process-dot',
            y_align: Clutter.ActorAlign.CENTER,
        });
        const nameLabel = new St.Label({
            text: processName,
            style_class: 'portkiller-process-name-green',
            y_align: Clutter.ActorAlign.CENTER,
        });
        const countLabel = new St.Label({
            text: ` : ${ports.length} ports`,
            style_class: 'portkiller-process-count-muted',
            y_align: Clutter.ActorAlign.CENTER,
        });
        headerRow.add_child(dotLabel);
        headerRow.add_child(nameLabel);
        headerRow.add_child(countLabel);
        groupItem.insert_child_at_index(headerRow, 1);
        groupItem.label_actor = nameLabel;

        for (const portInfo of ports) {
            const childItem = this._createPortRowItem(portInfo);
            groupItem.menu.addMenuItem(childItem);
        }

        this._section.addMenuItem(groupItem);
    }

    _createPortRowItem({ port, pid, processName }) {
        const item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'portkiller-port-item',
        });

        const rowBox = new St.BoxLayout({
            style_class: 'portkiller-port-row',
            x_expand: true,
        });

        // Port number pill
        const portPill = new St.Label({
            text: `:${port}`,
            style_class: 'portkiller-port-pill',
            y_align: Clutter.ActorAlign.CENTER,
        });

        // Process info
        const infoBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'portkiller-info-box',
        });
        const procLabel = new St.Label({
            text: processName,
            style_class: 'portkiller-proc-name',
        });
        const pidLabel = new St.Label({
            text: pid ? `PID ${pid}` : 'PID unknown',
            style_class: 'portkiller-pid-label',
        });
        infoBox.add_child(procLabel);
        infoBox.add_child(pidLabel);

        // Kill button
        const killBtn = new St.Button({
            style_class: 'portkiller-kill-btn',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });
        const killBtnBox = new St.BoxLayout({ vertical: false });
        const killIcon = new St.Icon({
            icon_name: 'window-close-symbolic',
            icon_size: 12,
            style_class: 'portkiller-kill-icon',
        });
        const killLabel = new St.Label({
            text: 'Kill',
            style_class: 'portkiller-kill-label',
            y_align: Clutter.ActorAlign.CENTER,
        });
        killBtnBox.add_child(killIcon);
        killBtnBox.add_child(killLabel);
        killBtn.set_child(killBtnBox);

        killBtn.connect('clicked', () => {
            if (pid) {
                const result = killProcess(pid);
                if (result.success) {
                    // Show brief success state on button
                    killBtn.add_style_class_name('portkiller-kill-success');
                    killBtn.set_reactive(false);
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                        this._refresh();
                        return GLib.SOURCE_REMOVE;
                    });
                } else {
                    killBtn.add_style_class_name('portkiller-kill-fail');
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                        killBtn.remove_style_class_name('portkiller-kill-fail');
                        return GLib.SOURCE_REMOVE;
                    });
                }
            }
        });

        rowBox.add_child(portPill);
        rowBox.add_child(infoBox);
        rowBox.add_child(killBtn);
        item.add_child(rowBox);
        return item;
    }

    _addPortRow(portInfo) {
        const item = this._createPortRowItem(portInfo);
        this._section.addMenuItem(item);
    }

    // ── Kill all ───────────────────────────────────────────────────────────

    _killAll() {
        if (this._ports.length === 0) return;
        if (!this._killAllArmed) {
            this._armKillAll();
            return;
        }

        this._disarmKillAll();
        killAllPorts(this._ports);
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
            this._refresh();
            return GLib.SOURCE_REMOVE;
        });
    }

    _armKillAll() {
        this._killAllArmed = true;
        this._killAllItem.add_style_class_name('portkiller-killall-armed');
        if (this._killAllLabel?.set_text) {
            this._killAllLabel.set_text('Confirm Kill All');
        }

        if (this._killAllConfirmTimeout) {
            GLib.source_remove(this._killAllConfirmTimeout);
        }

        this._killAllConfirmTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
            this._disarmKillAll();
            return GLib.SOURCE_REMOVE;
        });
    }

    _disarmKillAll() {
        this._killAllArmed = false;
        this._killAllItem.remove_style_class_name('portkiller-killall-armed');
        if (this._killAllLabel?.set_text) {
            this._killAllLabel.set_text('Kill All Ports');
        }
        if (this._killAllConfirmTimeout) {
            GLib.source_remove(this._killAllConfirmTimeout);
            this._killAllConfirmTimeout = null;
        }
    }

    // ── Cleanup ────────────────────────────────────────────────────────────

    destroy() {
        if (this._refreshTimeout) {
            GLib.source_remove(this._refreshTimeout);
            this._refreshTimeout = null;
        }
        if (this._killAllConfirmTimeout) {
            GLib.source_remove(this._killAllConfirmTimeout);
            this._killAllConfirmTimeout = null;
        }
        super.destroy();
    }
});

// ─── Extension Class ─────────────────────────────────────────────────────────

export default class PortKillerExtension extends Extension {
    enable() {
        this._indicator = new PortKillerIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'right');
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
