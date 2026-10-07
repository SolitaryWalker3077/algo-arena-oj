package com.oj.judge.rabbit;

import com.oj.api.entity.dto.JudgeSubmitDto;
import com.oj.common.constants.RabbitMQConstants;
import com.oj.judge.service.IJudgeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class JudgeConsumer {

    @Autowired
    private IJudgeService judgeService;

    //定义消费者
    @RabbitListener(queues = RabbitMQConstants.OJ_WORK_QUEUE)
    public void consume(JudgeSubmitDto judgeSubmitDTO) {
        log.info("收到消息为: {}", judgeSubmitDTO);
        judgeService.doJudgeJavaCode(judgeSubmitDTO);
    }
}
