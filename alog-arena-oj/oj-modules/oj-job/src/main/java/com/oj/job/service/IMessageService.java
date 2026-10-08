package com.oj.job.service;

import com.oj.job.entity.message.Message;

import java.util.List;

public interface IMessageService {
    boolean batchInsert(List<Message> messageList);
}
