package talk.phreox.backend.task;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

public final class WorkEngine implements AutoCloseable {

    private static final Duration SHUTDOWN_TIMEOUT = Duration.ofSeconds(5);

    private final ExecutorService io;
    private final ExecutorService compute;

    public WorkEngine() {
        var processors = Runtime.getRuntime().availableProcessors();
        var computeThreads = Math.max(2, processors - 1);

        io = Executors.newVirtualThreadPerTaskExecutor();
        compute = Executors.newFixedThreadPool(computeThreads, Thread.ofPlatform().name("phreox-compute-", 0).factory());
    }

    public CompletableFuture<Void> io(Runnable task) {
        return CompletableFuture.runAsync(task, io);
    }

    public <T> CompletableFuture<T> io(Supplier<T> task) {
        return CompletableFuture.supplyAsync(task, io);
    }

    public CompletableFuture<Void> compute(Runnable task) {
        return CompletableFuture.runAsync(task, compute);
    }

    public <T> CompletableFuture<T> compute(Supplier<T> task) {
        return CompletableFuture.supplyAsync(task, compute);
    }

    @Override
    public void close() {
        io.shutdown();
        compute.shutdown();

        await(io);
        await(compute);
    }

    private void await(ExecutorService executor) {
        try {
            if (executor.awaitTermination(SHUTDOWN_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS)) {
                return;
            }

            executor.shutdownNow();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            executor.shutdownNow();
        }
    }
}