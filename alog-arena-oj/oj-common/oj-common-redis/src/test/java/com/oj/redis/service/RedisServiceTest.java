package com.oj.redis.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RedisServiceTest {

    @Test
    void removeForListRemovesAllDuplicateValues() {
        RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
        ListOperations<String, Object> listOperations = mock(ListOperations.class);
        when(redisTemplate.opsForList()).thenReturn(listOperations);

        RedisService redisService = new RedisService();
        redisService.redisTemplate = redisTemplate;
        redisService.removeForList("e:t:l", 1001L);

        verify(listOperations).remove("e:t:l", 0L, 1001L);
    }
}
