import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class PortKillerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: 'Indicator Settings',
            description: 'Configure how the indicator looks when ports are active',
        });
        page.add(group);

        const row = new Adw.ComboRow({
            title: 'Badge Display Mode',
            subtitle: 'Choose what to show next to the icon',
            model: Gtk.StringList.new([
                'Show quantity of ports',
                'Show active dot',
                'Show nothing'
            ])
        });
        group.add(row);

        settings.bind('badge-display-mode', row, 'selected', Gio.SettingsBindFlags.DEFAULT);

        const viewRow = new Adw.ComboRow({
            title: 'Port View Mode',
            subtitle: 'Choose list view or grouped-by-process view',
            model: Gtk.StringList.new([
                'List by port',
                'Group by process',
            ]),
        });
        group.add(viewRow);

        settings.bind('port-view-mode', viewRow, 'selected', Gio.SettingsBindFlags.DEFAULT);

        window.add(page);
    }
}
