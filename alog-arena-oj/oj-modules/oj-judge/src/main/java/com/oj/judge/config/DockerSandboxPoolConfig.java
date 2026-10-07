package com.oj.judge.config;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientBuilder;
import com.github.dockerjava.netty.NettyDockerCmdExecFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DockerSandboxPoolConfig {

    @Value("${sandbox.docker.host:tcp://localhost:2375}")
    private String dockerHost;

    @Value("${sandbox.docker.image:eclipse-temurin:8-jdk-alpine}")
    private String sandboxImage;

    @Value("${sandbox.docker.volume:/usr/share/java}")
    private String volumeDir;


    @Value("${sandbox.limit.memory:100000000}")
    private Long memoryLimit;

    @Value("${sandbox.limit.memory-swap:100000000}")
    private Long memorySwapLimit;

    @Value("${sandbox.limit.cpu:1}")
    private Long cpuLimit;

    @Value("${sandbox.docker.pool.size:4}")
    private int poolSize;

    @Value("${sandbox.docker.name-prefix:oj-sandbox-jdk}")
    private String containerNamePrefix;

    private DockerClient dockerClient;

    @Bean
    public DockerClient createDockerClient() {
        DefaultDockerClientConfig clientConfig = DefaultDockerClientConfig.createDefaultConfigBuilder()
                .withDockerHost(dockerHost)
                .build();
        dockerClient = DockerClientBuilder
                .getInstance(clientConfig)
                .withDockerCmdExecFactory(new NettyDockerCmdExecFactory())
                .build();
        return dockerClient;
    }

    @Bean
    public DockerSandboxPool createDockerSandBoxPool(DockerClient dockerClient) {
        DockerSandboxPool dockerSandBoxPool = new DockerSandboxPool(dockerClient, sandboxImage, volumeDir, memoryLimit,
                memorySwapLimit, cpuLimit, poolSize, containerNamePrefix);
        dockerSandBoxPool.initDockerPool();
        return dockerSandBoxPool;
    }

}
