package com.oj.redis.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class RedisConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(RedisConfig.class, RedisAutoConfiguration.class));

    @Test
    void createsJsonRedisTemplateWithBootConnectionFactory() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(RedisConnectionFactory.class);
            assertThat(context).hasBean("redisTemplate");

            RedisTemplate<?, ?> redisTemplate = context.getBean("redisTemplate", RedisTemplate.class);
            assertThat(redisTemplate.getConnectionFactory()).isNotNull();
            assertThat(redisTemplate.getValueSerializer()).isInstanceOf(JsonRedisSerializer.class);
        });
    }
}
