package talk.phreox.service.device;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.service.Validation;

import java.time.Clock;
import java.util.ArrayList;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Devices and their MLS key packages. The service stores opaque blobs and never holds private keys. */
public final class DeviceService {

    private static final int MAX_DEVICES = 20;
    private static final int MAX_KEY_PACKAGES = 100;
    private static final int MAX_KEY_BYTES = 4096;
    private static final int MAX_KEY_PACKAGE_BYTES = 16 * 1024;
    private static final int MAX_NAME_LENGTH = 64;

    private final Map<UUID, ServiceApi.DeviceView> devices = new HashMap<>();
    private final Map<UUID, Deque<String>> keyPackages = new HashMap<>();
    private final Clock clock;

    public DeviceService(Clock clock) {
        this.clock = clock;
    }

    /** The first active device of an account is trusted, later ones need to be trusted by an existing trusted device. */
    public synchronized ServiceApi.DeviceView register(UUID accountId, ServiceApi.RegisterDeviceRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is missing");
        }

        var name = Validation.text(request.name(), "name", MAX_NAME_LENGTH);
        Validation.base64(request.identityKey(), "identityKey", MAX_KEY_BYTES);
        Validation.base64(request.signatureKey(), "signatureKey", MAX_KEY_BYTES);

        var packages = checkedPackages(request.keyPackages(), true);
        var active = active(accountId);

        if (active.size() >= MAX_DEVICES) {
            throw ApiException.conflict("Device limit reached");
        }

        var trusted = active.stream().noneMatch(ServiceApi.DeviceView::trusted);
        var device = new ServiceApi.DeviceView(UUID.randomUUID(), accountId, name, request.identityKey(), request.signatureKey(), trusted, false, clock.millis());

        devices.put(device.id(), device);
        keyPackages.put(device.id(), new ArrayDeque<>(packages));

        return device;
    }

    public synchronized List<ServiceApi.DeviceView> list(UUID accountId) {
        return devices.values().stream()
                .filter(device -> device.accountId().equals(accountId))
                .sorted((a, b) -> Long.compare(a.createdAt(), b.createdAt()))
                .toList();
    }

    public synchronized void revoke(UUID accountId, UUID deviceId) {
        var device = owned(accountId, deviceId);

        devices.put(deviceId, new ServiceApi.DeviceView(device.id(), device.accountId(), device.name(), device.identityKey(), device.signatureKey(), false, true, device.createdAt()));
        keyPackages.remove(deviceId);
    }

    public synchronized ServiceApi.DeviceView trust(UUID accountId, UUID deviceId, ServiceApi.TrustDeviceRequest request) {
        if (request == null || request.trustedBy() == null) {
            throw new IllegalArgumentException("trustedBy is missing");
        }

        var device = owned(accountId, deviceId);
        var truster = owned(accountId, request.trustedBy());

        if (device.revoked() || truster.revoked() || !truster.trusted()) {
            throw ApiException.forbidden("Trusting device must be active and trusted");
        }

        var trusted = new ServiceApi.DeviceView(device.id(), device.accountId(), device.name(), device.identityKey(), device.signatureKey(), true, false, device.createdAt());

        devices.put(deviceId, trusted);
        return trusted;
    }

    public synchronized void addKeyPackages(UUID accountId, UUID deviceId, ServiceApi.KeyPackagesRequest request) {
        var device = owned(accountId, deviceId);

        if (device.revoked()) {
            throw ApiException.forbidden("Device is revoked");
        }

        var added = checkedPackages(request == null ? null : request.keyPackages(), false);
        var stored = keyPackages.computeIfAbsent(deviceId, ignored -> new ArrayDeque<>());

        if (stored.size() + added.size() > MAX_KEY_PACKAGES) {
            throw ApiException.conflict("Too many stored key packages");
        }

        stored.addAll(added);
    }

    /** Hands out and consumes one key package per active device, a key package is used only once. */
    public synchronized List<ServiceApi.KeyPackageClaim> claim(UUID accountId) {
        var claims = new ArrayList<ServiceApi.KeyPackageClaim>();

        for (var device : active(accountId)) {
            var stored = keyPackages.get(device.id());
            var keyPackage = stored == null ? null : stored.pollFirst();

            if (keyPackage != null) {
                claims.add(new ServiceApi.KeyPackageClaim(device.id(), keyPackage));
            }
        }

        return claims;
    }

    public synchronized ServiceApi.DeviceView requireActive(UUID accountId, UUID deviceId) {
        var device = deviceId == null ? null : devices.get(deviceId);

        if (device == null || device.revoked() || !device.accountId().equals(accountId)) {
            throw ApiException.forbidden("Unknown or revoked device");
        }

        return device;
    }

    private ServiceApi.DeviceView owned(UUID accountId, UUID deviceId) {
        var device = deviceId == null ? null : devices.get(deviceId);

        if (device == null || !device.accountId().equals(accountId)) {
            throw ApiException.notFound("Device not found");
        }

        return device;
    }

    private List<ServiceApi.DeviceView> active(UUID accountId) {
        return devices.values().stream()
                .filter(device -> device.accountId().equals(accountId) && !device.revoked())
                .sorted((a, b) -> Long.compare(a.createdAt(), b.createdAt()))
                .toList();
    }

    private static List<String> checkedPackages(List<String> packages, boolean optional) {
        if (packages == null) {
            if (optional) {
                return List.of();
            }

            throw new IllegalArgumentException("keyPackages is missing");
        }

        if (packages.size() > MAX_KEY_PACKAGES) {
            throw new IllegalArgumentException("At most " + MAX_KEY_PACKAGES + " key packages per request");
        }

        packages.forEach(keyPackage -> Validation.base64(keyPackage, "keyPackage", MAX_KEY_PACKAGE_BYTES));
        return List.copyOf(packages);
    }
}
